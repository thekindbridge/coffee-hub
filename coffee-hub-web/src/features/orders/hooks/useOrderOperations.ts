import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  assignAgentToOrderRequest,
  cancelOrderRequest,
  completeDeliveryRequest,
  updateOrderStatusRequest,
} from '../../../services/api/ordersService';
import { alertInBrowser } from '../../../services/browser/dialogService';
import {
  getCurrentUserIdToken,
  logoutCurrentUser,
} from '../../../services/firebase/authService';
import { persistActiveDeliverySession } from '../../../services/firebase/orderCounterService';
import {
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../../../agent/agentTracker';
import {
  getOrderStatusLabel,
  isCustomerCancellableOrderStatus,
  normalizeOrderStatusCode,
} from '../../../../shared/orderStatus';
import type {
  DeliveryAgent,
  DeliveryLocation,
  Order,
  OrderStatusCode,
} from '../../../types';
import { DEFAULT_TRACKER_STATUS } from '../../app/lib/constants';

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
  const replaceOrderLocalState = (nextOrder: Order) => {
    const mergeOrder = (order: Order) => (
      order.doc_id === nextOrder.doc_id
        ? {
            ...nextOrder,
            items: nextOrder.items && nextOrder.items.length > 0
              ? nextOrder.items
              : order.items,
          }
        : order
    );

    setAdminOrders(prev => prev.map(mergeOrder));
    setUserOrders(prev => prev.map(mergeOrder));
    setOrderStatus(prev => (prev && prev.doc_id === nextOrder.doc_id ? mergeOrder(prev) : prev));
  };

  const toFirestoreLocation = (location: DeliveryLocation) => ({
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy ?? null,
  });

  const handleStartDelivery = async () => {
    if (!currentDeliveryOrder?.customer_location) {
      alertInBrowser('This order is missing customer coordinates, so live delivery cannot start.');
      return;
    }

    if (currentDeliveryOrder.status_code !== 'OUT_FOR_DELIVERY') {
      alertInBrowser('Tracking can only start once the order is out for delivery.');
      return;
    }

    const agentId =
      currentDeliveryOrder.delivery_agent_id ||
      currentDeliveryAgent?.id ||
      normalizedCurrentEmail;
    if (!agentId) {
      alertInBrowser('Unable to identify the assigned delivery agent for this order.');
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

    await persistActiveDeliverySession({
      agentId,
      agentName:
        currentDeliveryAgent?.name ||
        currentDeliveryOrder.delivery_agent_name ||
        'Assigned agent',
      customerLocation: currentDeliveryOrder.customer_location,
      orderDocId: currentDeliveryOrder.doc_id,
      orderId: currentDeliveryOrder.id,
    });
  };

  const handleEndDelivery = async (orderDocId: string) => {
    const orderToComplete =
      (currentDeliveryOrder?.doc_id === orderDocId ? currentDeliveryOrder : null) ||
      adminOrders.find(order => order.doc_id === orderDocId) ||
      userOrders.find(order => order.doc_id === orderDocId) ||
      (orderStatus?.doc_id === orderDocId ? orderStatus : null);

    if (!orderToComplete) {
      alertInBrowser('Unable to find the order for this delivery.');
      return;
    }

    try {
      const idToken = await getCurrentUserIdToken(true);
      if (!idToken) {
        throw new Error('Please sign in again before ending the delivery.');
      }

      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      const response = await completeDeliveryRequest(
        {
          orderId: orderToComplete.doc_id,
          finalLocation: agentLastTrackedLocation
            ? toFirestoreLocation(agentLastTrackedLocation)
            : null,
        },
        idToken,
      );

      replaceOrderLocalState(response.order);
      setAgentTrackerStatus({
        lifecycle: 'completed',
        message: 'Delivery ended and the order is marked as delivered.',
      });
    } catch (error) {
      console.error('Failed to end delivery', error);
      alertInBrowser('Unable to end this delivery right now.');
    }
  };

  const updateOrderStatus = async ({
    orderId,
    status,
    rejectionReason = '',
  }: {
    orderId: string;
    status: OrderStatusCode;
    rejectionReason?: string;
  }) => {
    const existingOrder =
      adminOrders.find(order => order.doc_id === orderId) ||
      userOrders.find(order => order.doc_id === orderId) ||
      (orderStatus?.doc_id === orderId ? orderStatus : null);

    if (!existingOrder) {
      throw new Error('Unable to find the order for this update.');
    }

    const nextStatusLabel = getOrderStatusLabel(status);
    const requiresAgent =
      nextStatusLabel === 'Out for Delivery' ||
      nextStatusLabel === 'Delivered';

    if (requiresAgent && !existingOrder.delivery_agent_id) {
      throw new Error('Assign an agent before updating this status.');
    }

    const idToken = await getCurrentUserIdToken(true);
    if (!idToken) {
      throw new Error('Please sign in again before updating the order.');
    }

    const response = await updateOrderStatusRequest(
      {
        orderId,
        status: normalizeOrderStatusCode(status),
        rejectionReason,
      },
      idToken,
    );

    replaceOrderLocalState(response.order);
    setNewOrderDocIds(prev => prev.filter(id => id !== response.order.doc_id));
    return response.order;
  };

  const assignAgentToOrder = async (orderDocId: string, agentId: string) => {
    const idToken = await getCurrentUserIdToken(true);
    if (!idToken) {
      throw new Error('Please sign in again before assigning a delivery agent.');
    }

    const response = await assignAgentToOrderRequest(
      {
        orderId: orderDocId,
        agentId,
      },
      idToken,
    );

    replaceOrderLocalState(response.order);
    setNewOrderDocIds(prev => prev.filter(id => id !== response.order.doc_id));
    return response.order;
  };

  const cancelOrder = async (orderId: string, cancellationReason: string) => {
    const existingOrder =
      userOrders.find(order => order.doc_id === orderId) ||
      (orderStatus?.doc_id === orderId ? orderStatus : null);

    if (!existingOrder) {
      throw new Error('Unable to find the order to cancel.');
    }

    if (!isCustomerCancellableOrderStatus(existingOrder.status_code)) {
      throw new Error('Order cannot be cancelled at this stage.');
    }

    const nextReason = cancellationReason.trim();
    if (!nextReason) {
      throw new Error('Select a cancellation reason before confirming.');
    }

    const idToken = await getCurrentUserIdToken(true);
    if (!idToken) {
      throw new Error('Please sign in again before cancelling the order.');
    }

    const response = await cancelOrderRequest(
      {
        cancellationReason: nextReason,
        orderId,
      },
      idToken,
    );

    replaceOrderLocalState(response.order);
    setNewOrderDocIds(prev => prev.filter(id => id !== response.order.doc_id));
    return response.order;
  };

  const handleLogout = async () => {
    try {
      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
      setAgentLastTrackedLocation(null);
      await logoutCurrentUser();
      onAfterLogout?.();
    } catch (error) {
      console.error('Logout failed', error);
      alertInBrowser('Unable to log out right now.');
    }
  };

  return {
    assignAgentToOrder,
    cancelOrder,
    handleStartDelivery,
    handleEndDelivery,
    updateOrderStatus,
    handleLogout,
  };
};
