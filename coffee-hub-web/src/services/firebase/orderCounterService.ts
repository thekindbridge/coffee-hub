import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { DeliveryLocation } from '../../types';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

export const persistActiveDeliverySession = async ({
  agentId,
  agentName,
  customerLocation,
  orderDocId,
  orderId,
}: {
  agentId: string;
  agentName: string;
  customerLocation: DeliveryLocation;
  orderDocId: string;
  orderId: string;
}) => {
  try {
    await setDoc(
      doc(db, 'delivery_sessions', orderId),
      {
        agentId,
        agentName,
        orderDocId,
        orderId,
        startedAt: serverTimestamp(),
        status: 'active',
        updatedAt: serverTimestamp(),
        customerLocation,
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to persist the active delivery session.',
      'network',
    );
  }
};
