import { useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import {
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { persistActiveDeliverySession } from '../services/firebase/orderCounterService';
import { getFirebaseDb } from '../services/firebase';
import {
  DEFAULT_TRACKER_STATUS,
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../delivery-agent/tracking/agentTracker';
import { getOrderStatusFirestoreValue } from '../shared/orderStatus';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestoreData';
import type {
  DeliveryAgent,
  DeliveryLocation,
  Order,
} from '../types';

type UseOrderOperationsParams = {
  agentLastTrackedLocation: DeliveryLocation | null;
  agentTrackerRef: MutableRefObject<ReturnType<typeof createAgentTracker> | null>;
  currentDeliveryAgent: DeliveryAgent | null;
  currentDeliveryOrder: Order | null;
  normalizedCurrentEmail: string;
  orders: Order[];
  setAgentLastTrackedLocation: Dispatch<SetStateAction<DeliveryLocation | null>>;
  setAgentPermissionState: Dispatch<SetStateAction<AgentTrackerPermissionState>>;
  setAgentTrackerStatus: Dispatch<SetStateAction<AgentTrackerStatus>>;
  setIsAgentTracking: Dispatch<SetStateAction<boolean>>;
  trackedOrderIdRef: MutableRefObject<string>;
};

const toFirestoreLocation = (location: DeliveryLocation) => ({
  accuracy: location.accuracy ?? null,
  lat: location.lat,
  lng: location.lng,
  updatedAt: serverTimestamp(),
});

const normalizeAgentId = (value: string) => value.trim().toLowerCase();

export const useOrderOperations = ({
  agentLastTrackedLocation,
  agentTrackerRef,
  currentDeliveryAgent,
  currentDeliveryOrder,
  normalizedCurrentEmail,
  orders,
  setAgentLastTrackedLocation,
  setAgentPermissionState,
  setAgentTrackerStatus,
  setIsAgentTracking,
  trackedOrderIdRef,
}: UseOrderOperationsParams) => {
  const [acceptingOrderDocId, setAcceptingOrderDocId] = useState('');
  const [isStartingDelivery, setIsStartingDelivery] = useState(false);
  const [isEndingDelivery, setIsEndingDelivery] = useState(false);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);

  const handleAcceptDelivery = async (orderDocId?: string) => {
    const orderToAccept = orderDocId
      ? orders.find(order => order.doc_id === orderDocId) || null
      : currentDeliveryOrder;

    if (!orderToAccept) {
      Alert.alert('Order missing', 'Unable to find the order for this delivery.');
      return;
    }

    if (orderToAccept.delivery_delivered_at || orderToAccept.status_code === 'DELIVERED') {
      Alert.alert('Already completed', 'This order has already been marked as delivered.');
      return;
    }

    if (orderToAccept.delivery_picked_at) {
      return;
    }

    const assignedAgentId = (
      orderToAccept.delivery_agent_id ||
      orderToAccept.assigned_agent_id ||
      ''
    ).trim();
    const agentId = normalizeAgentId(
      assignedAgentId ||
      currentDeliveryAgent?.id ||
      normalizedCurrentEmail,
    );

    if (!assignedAgentId || !agentId) {
      Alert.alert(
        'Missing agent',
        'This order must be assigned to a delivery agent before delivery can begin.',
      );
      return;
    }

    const currentOrderId = currentDeliveryAgent?.current_order_id?.trim();
    if (currentOrderId && currentOrderId !== orderToAccept.id) {
      Alert.alert(
        'Active delivery',
        'Finish or release the current delivery before accepting another order.',
      );
      return;
    }

    setAcceptingOrderDocId(orderToAccept.doc_id);

    try {
      const db = getFirebaseDb();
      const batch = writeBatch(db);

      batch.set(
        doc(db, 'orders', orderToAccept.doc_id),
        sanitizeFirestoreData({
          deliveryPickedAt: serverTimestamp(),
          delivery_picked_at: serverTimestamp(),
          orderStatus: 'OUT_FOR_DELIVERY',
          pickedAt: serverTimestamp(),
          status: getOrderStatusFirestoreValue('OUT_FOR_DELIVERY'),
          status_code: 'OUT_FOR_DELIVERY',
          updatedAt: serverTimestamp(),
          updated_at: serverTimestamp(),
        }),
        { merge: true },
      );

      batch.set(
        doc(db, 'agents', agentId),
        sanitizeFirestoreData({
          currentOrderId: orderToAccept.id,
          isActive: true,
          status: 'busy',
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );

      batch.set(
        doc(db, 'delivery_sessions', orderToAccept.id),
        sanitizeFirestoreData({
          agentId,
          agentName:
            currentDeliveryAgent?.name ||
            orderToAccept.delivery_agent_name ||
            'Assigned agent',
          orderDocId: orderToAccept.doc_id,
          orderId: orderToAccept.id,
          status: 'assigned',
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      await batch.commit();
    } catch (error) {
      console.error('Failed to accept delivery', error);
      Alert.alert('Accept error', 'Unable to accept this delivery right now.');
    } finally {
      setAcceptingOrderDocId('');
    }
  };

  const handleStartDelivery = async () => {
    if (!currentDeliveryOrder?.customer_location) {
      Alert.alert(
        'Missing location',
        'This order is missing customer coordinates, so live delivery cannot start.',
      );
      return;
    }

    if (currentDeliveryOrder.status_code !== 'OUT_FOR_DELIVERY') {
      Alert.alert(
        'Unavailable',
        'Tracking can only start once the order is out for delivery.',
      );
      return;
    }

    const agentId =
      normalizeAgentId(
        currentDeliveryOrder.delivery_agent_id ||
        currentDeliveryOrder.assigned_agent_id ||
        currentDeliveryAgent?.id ||
        normalizedCurrentEmail,
      );

    if (!agentId) {
      Alert.alert(
        'Missing agent',
        'Unable to identify the assigned delivery agent for this order.',
      );
      return;
    }

    setIsStartingDelivery(true);

    try {
      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setAgentLastTrackedLocation(null);

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
        agentTrackerRef.current = null;
        trackedOrderIdRef.current = '';
        setIsAgentTracking(false);
        return;
      }

      trackedOrderIdRef.current = currentDeliveryOrder.id;

      await Promise.all([
        persistActiveDeliverySession({
          agentId,
          agentName:
            currentDeliveryAgent?.name ||
            currentDeliveryOrder.delivery_agent_name ||
            'Assigned agent',
          customerLocation: currentDeliveryOrder.customer_location,
          orderDocId: currentDeliveryOrder.doc_id,
          orderId: currentDeliveryOrder.id,
        }),
        setDoc(
          doc(getFirebaseDb(), 'agents', agentId),
          sanitizeFirestoreData({
            currentOrderId: currentDeliveryOrder.id,
            isActive: true,
            status: 'busy',
            updatedAt: serverTimestamp(),
          }),
          { merge: true },
        ),
      ]);
    } catch (error) {
      console.error('Failed to start delivery tracking', error);
      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus({
        lifecycle: 'error',
        message: 'Unable to start live delivery tracking right now.',
      });
      Alert.alert('Tracking error', 'Unable to start live delivery tracking right now.');
    } finally {
      setIsStartingDelivery(false);
    }
  };

  const handleEndDelivery = async (orderDocId?: string) => {
    const orderToComplete =
      currentDeliveryOrder &&
      (!orderDocId || currentDeliveryOrder.doc_id === orderDocId)
        ? currentDeliveryOrder
        : null;

    if (!orderToComplete) {
      Alert.alert('Order missing', 'Unable to find the order for this delivery.');
      return;
    }

    const assignedAgentId = normalizeAgentId(
      orderToComplete.delivery_agent_id ||
      orderToComplete.assigned_agent_id ||
      '',
    );
    if (!assignedAgentId) {
      Alert.alert(
        'Missing assignment',
        'This order cannot be marked delivered until it has an assigned delivery agent.',
      );
      return;
    }

    setIsEndingDelivery(true);

    try {
      const db = getFirebaseDb();
      const agentId = normalizeAgentId(
        assignedAgentId ||
        currentDeliveryAgent?.id ||
        normalizedCurrentEmail,
      );
      const batch = writeBatch(db);
      const finalLocation = agentLastTrackedLocation
        ? toFirestoreLocation(agentLastTrackedLocation)
        : null;

      batch.set(
        doc(db, 'orders', orderToComplete.doc_id),
        sanitizeFirestoreData({
          deliveryDeliveredAt: serverTimestamp(),
          delivery_delivered_at: serverTimestamp(),
          deliveredAt: serverTimestamp(),
          orderStatus: 'DELIVERED',
          status: getOrderStatusFirestoreValue('DELIVERED'),
          status_code: 'DELIVERED',
          updatedAt: serverTimestamp(),
          updated_at: serverTimestamp(),
          'timestamps.deliveredAt': serverTimestamp(),
          ...(finalLocation ? { delivery_location: finalLocation } : {}),
          ...(finalLocation ? { deliveryLocation: finalLocation } : {}),
        }),
        { merge: true },
      );

      if (agentId) {
        batch.set(
          doc(db, 'agents', agentId),
          sanitizeFirestoreData({
            currentOrderId: '',
            isActive: true,
            status: 'active',
            updatedAt: serverTimestamp(),
            ...(finalLocation ? { currentLocation: finalLocation } : {}),
            ...(finalLocation ? { lastLocation: finalLocation } : {}),
          }),
          { merge: true },
        );
      }

      batch.set(
        doc(db, 'delivery_sessions', orderToComplete.id),
        sanitizeFirestoreData({
          completedAt: serverTimestamp(),
          orderDocId: orderToComplete.doc_id,
          orderId: orderToComplete.id,
          status: 'completed',
          updatedAt: serverTimestamp(),
          ...(finalLocation ? { lastLocation: finalLocation } : {}),
        }),
        { merge: true },
      );

      if (finalLocation && agentId) {
        batch.set(
          doc(db, 'agent_locations', orderToComplete.id),
          sanitizeFirestoreData({
            accuracy: agentLastTrackedLocation?.accuracy ?? null,
            agentId,
            lat: agentLastTrackedLocation?.lat,
            lng: agentLastTrackedLocation?.lng,
            orderDocId: orderToComplete.doc_id,
            updatedAt: serverTimestamp(),
          }),
          { merge: true },
        );
      }

      await batch.commit();

      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus({
        lifecycle: 'completed',
        message: 'Delivery ended and the order is marked as delivered.',
      });
    } catch (error) {
      console.error('Failed to end delivery', error);
      Alert.alert('Delivery error', 'Unable to end this delivery right now.');
    } finally {
      setIsEndingDelivery(false);
    }
  };

  const updateAvailability = async (isOnline: boolean) => {
    const agentId = normalizeAgentId(currentDeliveryAgent?.id || normalizedCurrentEmail);
    if (!agentId) {
      Alert.alert('Missing agent', 'Unable to update the delivery availability right now.');
      return;
    }

    if (!isOnline && currentDeliveryOrder) {
      Alert.alert(
        'Active delivery',
        'Complete the active delivery before switching offline.',
      );
      return;
    }

    setIsUpdatingAvailability(true);

    try {
      await setDoc(
        doc(getFirebaseDb(), 'agents', agentId),
        sanitizeFirestoreData({
          currentOrderId: currentDeliveryOrder?.id || '',
          isActive: isOnline,
          status: isOnline
            ? (currentDeliveryOrder ? 'busy' : 'active')
            : 'offline',
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );

      if (!isOnline) {
        agentTrackerRef.current?.stop();
        agentTrackerRef.current = null;
        trackedOrderIdRef.current = '';
        setIsAgentTracking(false);
        setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
        setAgentLastTrackedLocation(null);
      }
    } catch (error) {
      console.error('Failed to update delivery availability', error);
      Alert.alert('Status error', 'Unable to update your availability right now.');
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  return {
    acceptingOrderDocId,
    handleAcceptDelivery,
    handleEndDelivery,
    handleStartDelivery,
    isEndingDelivery,
    isStartingDelivery,
    isUpdatingAvailability,
    updateAvailability,
  };
};
