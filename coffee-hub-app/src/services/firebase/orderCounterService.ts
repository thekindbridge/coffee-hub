import {
  doc,
  runTransaction,
} from 'firebase/firestore';
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
