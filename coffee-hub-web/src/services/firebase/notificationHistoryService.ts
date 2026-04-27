import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { AppNotification } from '../../types';
import { mapNotificationDocToNotification } from '../../features/app/lib/firestoreMappers';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const subscribeToUserNotifications = (
  currentUserId: string,
  onData: (notifications: AppNotification[]) => void,
  onError: (error: Error) => void,
  limitCount = 30,
) => onSnapshot(
  query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', currentUserId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  ),
  snapshot => {
    onData(snapshot.docs.map(mapNotificationDocToNotification));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load notifications right now.'));
  },
);

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      isRead: true,
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to mark this notification as read right now.',
      'network',
    );
  }
};
