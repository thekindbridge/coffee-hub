import {
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { DeliveryLocation } from '../../types';
import { toAppServiceError } from '../serviceError';
import { getFirebaseDb } from './firebaseConfig';

export const getNextOrderId = async (): Promise<string> => {
  try {
    const db = getFirebaseDb();
    const counterRef = doc(db, 'meta', 'orderCounter');
    const nextNumber = await runTransaction(db, async transaction => {
      const counterSnapshot = await transaction.get(counterRef);
      const currentValue =
        counterSnapshot.exists() && typeof counterSnapshot.data().nextOrderNumber === 'number'
          ? counterSnapshot.data().nextOrderNumber
          : 1001;

      transaction.set(counterRef, { nextOrderNumber: currentValue + 1 }, { merge: true });
      return currentValue;
    });

    return `COF${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    throw toAppServiceError(error, 'Unable to reserve a new order ID.', 'network');
  }
};

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
    const db = getFirebaseDb();

    await setDoc(
      doc(db, 'delivery_sessions', orderId),
      {
        agentId,
        agentName,
        customerLocation,
        orderDocId,
        orderId,
        startedAt: serverTimestamp(),
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to persist the active delivery session.', 'network');
  }
};
