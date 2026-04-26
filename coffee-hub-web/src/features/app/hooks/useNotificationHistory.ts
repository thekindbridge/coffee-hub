import { useEffect, useMemo, useState } from 'react';
import type { UserRole } from '../types';
import type { AppNotification } from '../../../types';
import {
  markNotificationAsRead,
  subscribeToUserNotifications,
} from '../../../services/firebase/notificationHistoryService';

export const useNotificationHistory = ({
  currentUserId,
  isAuthReady,
  isLoggedIn,
  role,
}: {
  currentUserId: string;
  isAuthReady: boolean;
  isLoggedIn: boolean;
  role: UserRole;
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMarkingId, setIsMarkingId] = useState('');

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId) {
      setNotifications([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError('');

    return subscribeToUserNotifications(
      currentUserId,
      nextNotifications => {
        setNotifications(nextNotifications);
        setIsLoading(false);
      },
      nextError => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );
  }, [currentUserId, isAuthReady, isLoggedIn, role]);

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.read).length,
    [notifications],
  );

  const handleMarkAsRead = async (notificationId: string) => {
    setIsMarkingId(notificationId);
    try {
      await markNotificationAsRead(notificationId);
    } finally {
      setIsMarkingId('');
    }
  };

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    isMarkingId,
    markAsRead: handleMarkAsRead,
  };
};
