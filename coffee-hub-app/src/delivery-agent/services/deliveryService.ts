import {
  collection,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import {
  mapDeliveryAgentDocToAgent,
  mapDeliverySessionRecordToSession,
} from '../lib/firestoreMappers';
import { fetchOrderItemsMap } from '../../services/firebase/orderItemsService';
import { getFirebaseDb } from '../../services/firebase';
import { toAppServiceError } from '../../services/serviceError';
import type { DeliveryAgent, DeliverySession, Order } from '../../types';

export const hydrateOrdersWithItems = async (orders: Order[]) => {
  const ordersMissingItems = orders.filter(order => order.items.length === 0);
  if (ordersMissingItems.length === 0) {
    return orders;
  }

  const orderItemsMap = await fetchOrderItemsMap(ordersMissingItems.map(order => order.id));

  return orders.map(order => ({
    ...order,
    items: orderItemsMap.get(order.id) || order.items || [],
  }));
};

export const subscribeToDeliveryAgents = (
  onData: (agents: DeliveryAgent[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(getFirebaseDb(), 'agents'),
  snapshot => {
    const agents = snapshot.docs
      .filter(docSnapshot => (docSnapshot.data() as Record<string, unknown>).accessOnly !== true)
      .map(mapDeliveryAgentDocToAgent);
    onData(agents);
  },
  error => {
    onError(toAppServiceError(error, 'Unable to subscribe to delivery agents.', 'network'));
  },
);

export const subscribeToCurrentDeliverySession = (
  orderId: string,
  onData: (sessions: DeliverySession[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(getFirebaseDb(), 'delivery_sessions', orderId),
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
    onError(toAppServiceError(error, 'Unable to subscribe to the delivery session.', 'network'));
  },
);
