import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  mapDeliveryAgentDocToAgent,
  mapDeliverySessionRecordToSession,
  mapOrderDocToOrder,
} from '../../features/app/lib/firestoreMappers';
import { db } from '../../services/firebase';
import { toAppServiceError } from '../../services/platform/serviceError';
import type { DeliveryAgent, DeliverySession, Order } from '../../types';

export const hydrateOrdersWithItems = async (orders: Order[]) => orders;

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

export const subscribeToAgentOrders = (
  agentId: string,
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(
    collection(db, 'orders'),
    where('assignedAgentId', '==', agentId),
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
    onError(toAppServiceError(error, 'Unable to subscribe to delivery orders.'));
  },
);

export const subscribeToAgentDeliverySessions = (
  agentId: string,
  onData: (sessions: DeliverySession[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(
    collection(db, 'delivery_sessions'),
    where('agentId', '==', agentId),
  ),
  snapshot => {
    onData(
      snapshot.docs.map(docSnapshot => mapDeliverySessionRecordToSession(
        docSnapshot.id,
        docSnapshot.data() as Record<string, unknown>,
      )),
    );
  },
  error => {
    onError(toAppServiceError(error, 'Unable to subscribe to delivery sessions.'));
  },
);
