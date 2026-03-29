import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import type { DeliveryAgent, DeliverySession, Order } from '../../types';
import {
  mapDeliveryAgentDocToAgent,
  mapDeliverySessionRecordToSession,
  mapOrderDocToOrder,
} from '../../features/app/lib/firestoreMappers';
import { db } from './index';

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
    onError(error instanceof Error ? error : new Error('Unable to subscribe to delivery agents.'));
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
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    onData(mappedOrders);
  },
  error => {
    onError(error instanceof Error ? error : new Error(`Unable to subscribe to ${status} agent orders.`));
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
    onError(error instanceof Error ? error : new Error('Unable to subscribe to the delivery session.'));
  },
);
