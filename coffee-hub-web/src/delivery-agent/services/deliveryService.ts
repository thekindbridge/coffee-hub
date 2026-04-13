import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  mapDeliveryAgentDocToAgent,
  mapDeliverySessionRecordToSession,
  mapOrderDocToOrder,
} from '../../features/app/lib/firestoreMappers';
import { fetchOrderItemsMap } from '../../services/firebase/orderItemsService';
import { db } from '../../services/firebase';
import { toAppServiceError } from '../../services/platform/serviceError';
import type { DeliveryAgent, DeliverySession, Order } from '../../types';

export const hydrateOrdersWithItems = async (orders: Order[]) => {
  const orderItemsMap = await fetchOrderItemsMap(orders.map(order => order.id));

  return orders.map(order => ({
    ...order,
    items: orderItemsMap.get(order.id) || order.items || [],
  }));
};

export const subscribeToDeliveryAgents = (
  onData: (agents: DeliveryAgent[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(db, 'agents'),
  snapshot => {
    const agents = snapshot.docs
      .filter(docSnapshot => (docSnapshot.data() as Record<string, unknown>).accessOnly !== true)
      .map(mapDeliveryAgentDocToAgent);
    onData(agents);
  },
  error => {
    onError(toAppServiceError(error, 'Unable to subscribe to delivery agents.'));
  },
);

export const subscribeToAgentOrdersByStatus = (
  agentId: string,
  status: 'OUT_FOR_DELIVERY' | 'DELIVERED',
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(
    collection(db, 'orders'),
    where('assignedAgentId', '==', agentId),
    where('status', '==', status),
  ),
  snapshot => {
    const mappedOrders = snapshot.docs
      .map(mapOrderDocToOrder)
      .sort((leftOrder, rightOrder) => (
        new Date(rightOrder.created_at).getTime() - new Date(leftOrder.created_at).getTime()
      ));
    onData(mappedOrders);
  },
  error => {
    onError(toAppServiceError(error, `Unable to subscribe to ${status} agent orders.`));
  },
);

export const subscribeToCurrentDeliverySession = (
  orderId: string,
  onData: (sessions: DeliverySession[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'delivery_sessions', orderId),
  snapshot => {
    if (!snapshot.exists()) {
      onData([]);
      return;
    }

    onData([
      mapDeliverySessionRecordToSession(
        snapshot.id,
        snapshot.data() as Record<string, unknown>,
      ),
    ]);
  },
  error => {
    onError(toAppServiceError(error, 'Unable to subscribe to the delivery session.'));
  },
);
