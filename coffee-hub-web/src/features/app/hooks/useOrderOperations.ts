import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../../services/firebase';
import {
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../../../agent/agentTracker';
import type {
  DeliveryAgent,
  DeliveryLocation,
  Order,
} from '../../../types';
import { DEFAULT_TRACKER_STATUS } from '../lib/constants';
import { normalizeOrderStatus } from '../lib/firestoreMappers';

type UseOrderOperationsParams = {
  adminOrders: Order[];
  setAdminOrders: Dispatch<SetStateAction<Order[]>>;
  userOrders: Order[];
  setUserOrders: Dispatch<SetStateAction<Order[]>>;
  orderStatus: Order | null;
  setOrderStatus: Dispatch<SetStateAction<Order | null>>;
  setNewOrderDocIds: Dispatch<SetStateAction<string[]>>;
  currentDeliveryOrder: Order | null;
  currentDeliveryAgent: DeliveryAgent | null;
  normalizedCurrentEmail: string;
  agentTrackerRef: MutableRefObject<ReturnType<typeof createAgentTracker> | null>;
  trackedOrderIdRef: MutableRefObject<string>;
  setIsAgentTracking: Dispatch<SetStateAction<boolean>>;
  setAgentPermissionState: Dispatch<SetStateAction<AgentTrackerPermissionState>>;
  setAgentTrackerStatus: Dispatch<SetStateAction<AgentTrackerStatus>>;
  agentLastTrackedLocation: DeliveryLocation | null;
  setAgentLastTrackedLocation: Dispatch<SetStateAction<DeliveryLocation | null>>;
  onAfterLogout?: () => void;
};

export const useOrderOperations = ({
  adminOrders,
  setAdminOrders,
  userOrders,
  setUserOrders,
  orderStatus,
  setOrderStatus,
  setNewOrderDocIds,
  currentDeliveryOrder,
  currentDeliveryAgent,
  normalizedCurrentEmail,
  agentTrackerRef,
  trackedOrderIdRef,
  setIsAgentTracking,
  setAgentPermissionState,
  setAgentTrackerStatus,
  agentLastTrackedLocation,
  setAgentLastTrackedLocation,
  onAfterLogout,
}: UseOrderOperationsParams) => {
  const applyOrderLocalUpdate = (
    orderDocId: string,
    updater: (order: Order) => Order,
  ) => {
    setAdminOrders(prev => prev.map(order => (
      order.doc_id === orderDocId ? updater(order) : order
    )));
    setUserOrders(prev => prev.map(order => (
      order.doc_id === orderDocId ? updater(order) : order
    )));
    setOrderStatus(prev => (
      prev && prev.doc_id === orderDocId ? updater(prev) : prev
    ));
  };

  const toFirestoreLocation = (location: DeliveryLocation) => ({
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy ?? null,
  });

  const markOrderDelivered = async (
    order: Order,
    finalLocation?: DeliveryLocation | null,
  ) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', order.doc_id), {
      status: 'Delivered',
      deliveredAt: serverTimestamp(),
      deliveryDeliveredAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'delivery_sessions', order.id),
      {
        agentId: order.delivery_agent_id || '',
        agentName: order.delivery_agent_name || '',
        completedAt: serverTimestamp(),
        lastLocation: finalLocation
          ? {
              ...toFirestoreLocation(finalLocation),
              updatedAt: serverTimestamp(),
            }
          : null,
        orderDocId: order.doc_id,
        orderId: order.id,
        status: 'completed',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    if (finalLocation) {
      batch.set(
        doc(db, 'agent_locations', order.id),
        {
          agentId: order.delivery_agent_id || '',
          orderDocId: order.doc_id,
          ...toFirestoreLocation(finalLocation),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (order.delivery_agent_id) {
      batch.set(
        doc(db, 'delivery_agents', order.delivery_agent_id),
        {
          currentOrderId: '',
          status: 'available',
          ...(finalLocation
            ? {
                lastLocation: {
                  ...toFirestoreLocation(finalLocation),
                  updatedAt: serverTimestamp(),
                },
              }
            : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();

    applyOrderLocalUpdate(order.doc_id, currentOrder => ({
      ...currentOrder,
      status: 'Delivered',
      delivery_delivered_at:
        currentOrder.delivery_delivered_at || new Date().toISOString(),
    }));
  };

  const handleStartDelivery = async () => {
    if (!currentDeliveryOrder?.customer_location) {
      alert('This order is missing customer coordinates, so live delivery cannot start.');
      return;
    }

    const agentId =
      currentDeliveryOrder.delivery_agent_id ||
      currentDeliveryAgent?.id ||
      normalizedCurrentEmail;
    if (!agentId) {
      alert('Unable to identify the assigned delivery agent for this order.');
      return;
    }

    agentTrackerRef.current?.stop();

    const tracker = createAgentTracker({
      agentId,
      onError: message => {
        console.error('Agent tracker error', message);
      },
      onLocation: location => {
        setAgentLastTrackedLocation(location);
      },
      onPermissionChange: permissionState => {
        setAgentPermissionState(permissionState);
      },
      onStatusChange: status => {
        setAgentTrackerStatus(status);
        setIsAgentTracking(
          status.lifecycle === 'starting' ||
            status.lifecycle === 'watching' ||
            status.lifecycle === 'restarting',
        );
      },
      orderDocId: currentDeliveryOrder.doc_id,
      orderId: currentDeliveryOrder.id,
    });

    agentTrackerRef.current = tracker;
    const didStart = await tracker.start();
    if (!didStart) {
      setIsAgentTracking(false);
      return;
    }

    trackedOrderIdRef.current = currentDeliveryOrder.id;

    const nowIso = new Date().toISOString();
    const orderDeliveryUpdate: Record<string, unknown> = {
      status: 'Out for Delivery',
      outForDeliveryAt: serverTimestamp(),
      deliveryOutForDeliveryAt: serverTimestamp(),
    };
    if (!currentDeliveryOrder.delivery_assigned_at) {
      orderDeliveryUpdate.assignedAt = serverTimestamp();
      orderDeliveryUpdate.deliveryAssignedAt = serverTimestamp();
    }

    await setDoc(
      doc(db, 'orders', currentDeliveryOrder.doc_id),
      orderDeliveryUpdate,
      { merge: true },
    );

    applyOrderLocalUpdate(currentDeliveryOrder.doc_id, order => ({
      ...order,
      status: 'Out for Delivery',
      delivery_assigned_at: order.delivery_assigned_at || nowIso,
      delivery_out_for_delivery_at: order.delivery_out_for_delivery_at || nowIso,
    }));

    await setDoc(
      doc(db, 'delivery_sessions', currentDeliveryOrder.id),
      {
        agentId,
        agentName:
          currentDeliveryAgent?.name ||
          currentDeliveryOrder.delivery_agent_name ||
          'Delivery Partner',
        orderDocId: currentDeliveryOrder.doc_id,
        orderId: currentDeliveryOrder.id,
        startedAt: serverTimestamp(),
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const handleEndDelivery = async (orderDocId: string) => {
    const orderToComplete =
      adminOrders.find(order => order.doc_id === orderDocId) ||
      userOrders.find(order => order.doc_id === orderDocId) ||
      (orderStatus?.doc_id === orderDocId ? orderStatus : null);

    if (!orderToComplete) {
      alert('Unable to find the order for this delivery.');
      return;
    }

    try {
      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      await markOrderDelivered(orderToComplete, agentLastTrackedLocation);
      setAgentTrackerStatus({
        lifecycle: 'completed',
        message: 'Delivery ended and the order is marked as delivered.',
      });
    } catch (error) {
      console.error('Failed to end delivery', error);
      alert('Unable to end this delivery right now.');
    }
  };

  const updateOrderStatus = async (orderDocId: string, status: Order['status']) => {
    const normalizedStatus = normalizeOrderStatus(status);
    const existingOrder =
      adminOrders.find(order => order.doc_id === orderDocId) ||
      userOrders.find(order => order.doc_id === orderDocId) ||
      (orderStatus?.doc_id === orderDocId ? orderStatus : null);

    if (!existingOrder) {
      alert('Unable to find the order for this update.');
      return;
    }

    const requiresAgent =
      normalizedStatus === 'Out for Delivery' ||
      normalizedStatus === 'Delivered';

    if (requiresAgent && !existingOrder.delivery_agent_id) {
      alert('Assign an agent before updating this status.');
      return;
    }

    if (normalizedStatus === 'Delivered') {
      try {
        agentTrackerRef.current?.stop();
        agentTrackerRef.current = null;
        trackedOrderIdRef.current = '';
        setIsAgentTracking(false);
        await markOrderDelivered(existingOrder, agentLastTrackedLocation);
      } catch (error) {
        console.error('Failed to complete delivery', error);
        alert('Unable to mark this order as delivered right now.');
      }
      return;
    }

    try {
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();
      const isPreDispatch =
        normalizedStatus === 'Pending' ||
        normalizedStatus === 'Preparing';

      const timestampUpdates: Record<string, unknown> = {};
      const localTimestampUpdates: Partial<Order> = {};

      if (normalizedStatus === 'Preparing' && !existingOrder.preparing_at) {
        timestampUpdates.preparingAt = serverTimestamp();
        localTimestampUpdates.preparing_at = nowIso;
      }

      if (normalizedStatus === 'Out for Delivery' && !existingOrder.delivery_assigned_at) {
        timestampUpdates.assignedAt = serverTimestamp();
        timestampUpdates.deliveryAssignedAt = serverTimestamp();
        localTimestampUpdates.delivery_assigned_at = nowIso;
      }

      if (normalizedStatus === 'Out for Delivery' && !existingOrder.delivery_out_for_delivery_at) {
        timestampUpdates.outForDeliveryAt = serverTimestamp();
        timestampUpdates.deliveryOutForDeliveryAt = serverTimestamp();
        localTimestampUpdates.delivery_out_for_delivery_at = nowIso;
      }

      const baseUpdate: Record<string, unknown> = {
        status: normalizedStatus,
        ...timestampUpdates,
      };

      if (isPreDispatch) {
        baseUpdate.agentId = deleteField();
        baseUpdate.agentName = deleteField();
        baseUpdate.agentPhone = deleteField();
        baseUpdate.agentEmail = deleteField();
        baseUpdate.agentVehicle = deleteField();
        baseUpdate.deliveryAgentId = deleteField();
        baseUpdate.deliveryAgentName = deleteField();
        baseUpdate.deliveryAgentPhone = deleteField();
        baseUpdate.deliveryAgentEmail = deleteField();
        baseUpdate.deliveryAgentVehicle = deleteField();
        baseUpdate.assignedAt = deleteField();
        baseUpdate.deliveryAssignedAt = deleteField();
        baseUpdate.pickedAt = deleteField();
        baseUpdate.deliveryPickedAt = deleteField();
        baseUpdate.outForDeliveryAt = deleteField();
        baseUpdate.deliveryOutForDeliveryAt = deleteField();
        baseUpdate.deliveredAt = deleteField();
        baseUpdate.deliveryDeliveredAt = deleteField();
      }

      batch.update(doc(db, 'orders', orderDocId), baseUpdate);

      if (isPreDispatch && existingOrder.delivery_agent_id) {
        batch.set(
          doc(db, 'delivery_agents', existingOrder.delivery_agent_id),
          {
            currentOrderId: '',
            status: 'available',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();

      applyOrderLocalUpdate(orderDocId, order => ({
        ...order,
        status: normalizedStatus,
        ...(isPreDispatch
          ? {
              delivery_agent_id: '',
              delivery_agent_name: '',
              delivery_agent_phone: '',
              delivery_agent_email: '',
              delivery_agent_vehicle: '',
              delivery_assigned_at: '',
              delivery_picked_at: '',
              delivery_out_for_delivery_at: '',
              delivery_delivered_at: '',
            }
          : {}),
        ...localTimestampUpdates,
      }));
      setNewOrderDocIds(prev => prev.filter(id => id !== orderDocId));
    } catch (error) {
      console.error('Failed to update order status', error);
      alert('Unable to update order status right now.');
    }
  };

  const handleLogout = async () => {
    try {
      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
      setAgentLastTrackedLocation(null);
      await signOut(auth);
      onAfterLogout?.();
    } catch (error) {
      console.error('Logout failed', error);
      alert('Unable to log out right now.');
    }
  };

  return {
    handleStartDelivery,
    handleEndDelivery,
    updateOrderStatus,
    handleLogout,
  };
};
