import { doc, onSnapshot } from 'firebase/firestore';
import type {
  DeliveryAgent,
  DeliveryLocation,
  DeliverySession,
  Order,
} from '../../types';
import {
  mapAgentRecordToAgent,
  mapDeliverySessionRecordToSession,
  mapLocationRecord,
  mapOrderRecordToOrder,
} from '../../features/app/lib/firestoreMappers';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

export const subscribeToTrackedOrder = (
  orderDocId: string,
  onData: (order: Order) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'orders', orderDocId),
  snapshot => {
    if (!snapshot.exists()) {
      return;
    }

    onData(
      mapOrderRecordToOrder(
        snapshot.id,
        snapshot.data() as Record<string, unknown>,
      ),
    );
  },
  error => {
    onError(toAppServiceError(error, 'Unable to subscribe to the order.'));
  },
);

export const subscribeToDeliverySession = (
  orderDocId: string,
  onData: (session: DeliverySession | null) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'delivery_sessions', orderDocId),
  snapshot => {
    if (!snapshot.exists()) {
      onData(null);
      return;
    }

    onData(
      mapDeliverySessionRecordToSession(
        snapshot.id,
        snapshot.data() as Record<string, unknown>,
      ),
    );
  },
  error => {
    onError(toAppServiceError(error, 'Unable to subscribe to the delivery session.'));
  },
);

export const subscribeToDeliveryAgent = (
  agentId: string,
  onData: (agent: DeliveryAgent | null) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'agents', agentId),
  snapshot => {
    if (!snapshot.exists()) {
      onData(null);
      return;
    }

    onData(
      mapAgentRecordToAgent(
        snapshot.id,
        snapshot.data() as Record<string, unknown>,
      ),
    );
  },
  error => {
    onError(toAppServiceError(error, 'Unable to subscribe to the delivery agent.'));
  },
);

export const subscribeToDeliveryLocation = ({
  agentId,
  onData,
  onError,
  orderDocId,
  orderId,
}: {
  orderDocId?: string;
  agentId?: string;
  orderId?: string;
  onData: (location: DeliveryLocation | null) => void;
  onError: (error: Error) => void;
}) => {
  const normalizedOrderDocId = orderDocId?.trim().toUpperCase() || '';
  const normalizedAgentId = agentId?.trim() || '';
  const normalizedOrderId = orderId?.trim().toUpperCase() || '';

  if (!normalizedOrderDocId && !normalizedAgentId && !normalizedOrderId) {
    onData(null);
    return () => undefined;
  }

  const targetDoc = normalizedOrderDocId
    ? doc(db, 'agent_locations', normalizedOrderDocId)
    : normalizedAgentId
      ? doc(db, 'agents', normalizedAgentId)
      : doc(db, 'orders', normalizedOrderDocId);

  return onSnapshot(
    targetDoc,
    snapshot => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      const snapshotData = snapshot.data() as Record<string, unknown>;
      const locationRecord = normalizedOrderId
        ? snapshotData
        : normalizedAgentId
          ? snapshotData.currentLocation ?? snapshotData.lastLocation
          : snapshotData.deliveryLocation;

      onData(mapLocationRecord(locationRecord));
    },
    error => {
      onError(toAppServiceError(error, 'Unable to subscribe to the delivery location.'));
    },
  );
};
