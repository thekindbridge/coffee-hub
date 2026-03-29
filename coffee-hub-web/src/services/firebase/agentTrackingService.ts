import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { DeliveryLocation } from '../../types';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

type PersistAgentTrackingLocationParams = {
  agentId: string;
  location: DeliveryLocation;
  orderDocId: string;
  orderId: string;
};

const toFirestoreLocation = (location: DeliveryLocation) => ({
  lat: location.lat,
  lng: location.lng,
  accuracy: location.accuracy ?? null,
  updatedAt: serverTimestamp(),
});

export const persistAgentTrackingLocation = async ({
  agentId,
  location,
  orderDocId,
  orderId,
}: PersistAgentTrackingLocationParams) => {
  try {
    await Promise.all([
      setDoc(
        doc(db, 'orders', orderDocId),
        {
          deliveryLocation: toFirestoreLocation(location),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      setDoc(
        doc(db, 'agent_locations', orderId),
        {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy ?? null,
          agentId,
          orderDocId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      setDoc(
        doc(db, 'agents', agentId),
        {
          isActive: true,
          currentOrderId: orderId,
          currentLocation: toFirestoreLocation(location),
          lastLocation: toFirestoreLocation(location),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      setDoc(
        doc(db, 'delivery_sessions', orderId),
        {
          orderId,
          orderDocId,
          agentId,
          status: 'active',
          updatedAt: serverTimestamp(),
          lastLocation: toFirestoreLocation(location),
        },
        { merge: true },
      ),
    ]);
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to update delivery tracking.',
      'network',
    );
  }
};
