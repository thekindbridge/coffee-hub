import { FirebaseError } from 'firebase/app';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { Order } from '../../types';
import { mapOrderDocToOrder } from '../../features/app/lib/firestoreMappers';
import { db } from './index';

export const subscribeToAdminOrders = (
  onData: (payload: {
    addedOrderDocIds: string[];
    orders: Order[];
    snapshotSize: number;
  }) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
  snapshot => {
    onData({
      addedOrderDocIds: snapshot
        .docChanges()
        .filter(change => change.type === 'added')
        .map(change => change.doc.id),
      orders: snapshot.docs.map(mapOrderDocToOrder),
      snapshotSize: snapshot.size,
    });
  },
  error => {
    onError(error instanceof Error ? error : new Error('Unable to subscribe to admin orders.'));
  },
);

export const subscribeToUserOrders = (
  currentUserId: string,
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => {
  const buildQuery = (withOrderBy: boolean) => query(
    collection(db, 'orders'),
    where('userId', '==', currentUserId),
    ...(withOrderBy ? [orderBy('createdAt', 'desc')] : []),
  );

  let activeUnsubscribe: (() => void) | null = null;
  let hasFallbackQuery = false;

  const subscribe = (withOrderBy: boolean) => {
    activeUnsubscribe = onSnapshot(
      buildQuery(withOrderBy),
      snapshot => {
        const mappedOrders = snapshot.docs.map(mapOrderDocToOrder);
        const sortedOrders = withOrderBy
          ? mappedOrders
          : [...mappedOrders].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );

        onData(sortedOrders);
      },
      error => {
        const shouldFallback = (
          withOrderBy &&
          !hasFallbackQuery &&
          error instanceof FirebaseError &&
          error.code === 'failed-precondition'
        );

        if (shouldFallback) {
          hasFallbackQuery = true;
          activeUnsubscribe?.();
          subscribe(false);
          return;
        }

        onError(error instanceof Error ? error : new Error('Unable to subscribe to user orders.'));
      },
    );
  };

  subscribe(true);

  return () => {
    activeUnsubscribe?.();
  };
};
