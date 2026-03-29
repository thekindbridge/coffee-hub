import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUserIdToken } from '../../../services/firebase/authService';
import {
  clearPushPermissionBannerDismissal,
  detectBrowserMessagingSupport,
  dismissPushPermissionBanner,
  getBrowserPushPermissionState,
  isPushPermissionBannerDismissed,
  requestBrowserPushPermission,
  subscribeToForegroundMessages,
  syncBrowserPushRegistration,
  type ForegroundNotification,
  type PushPermissionState,
} from '../../../services/browser/pushNotificationsService';

type UsePushNotificationsParams = {
  isAuthReady: boolean;
  isLoggedIn: boolean;
  currentUserId: string;
};

type PushNotificationsState = {
  permissionState: PushPermissionState;
  isSupported: boolean;
  isSyncing: boolean;
  syncError: string;
  isPermissionBannerVisible: boolean;
  foregroundNotification: ForegroundNotification | null;
  requestPermission: () => Promise<void>;
  dismissPermissionBanner: () => void;
  dismissForegroundNotification: () => void;
};

export const usePushNotifications = ({
  isAuthReady,
  isLoggedIn,
  currentUserId,
}: UsePushNotificationsParams): PushNotificationsState => {
  const [permissionState, setPermissionState] = useState<PushPermissionState>(
    getBrowserPushPermissionState(),
  );
  const [isMessagingSupported, setIsMessagingSupported] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [foregroundNotification, setForegroundNotification] =
    useState<ForegroundNotification | null>(null);
  const [isPermissionBannerDismissed, setIsPermissionBannerDismissed] =
    useState(isPushPermissionBannerDismissed);
  const lastSyncedKeyRef = useRef('');

  useEffect(() => {
    let isMounted = true;

    void detectBrowserMessagingSupport().then(supported => {
      if (!isMounted) {
        return;
      }

      setIsMessagingSupported(supported);
      setPermissionState(supported ? getBrowserPushPermissionState() : 'unsupported');
    }).catch(error => {
      console.error('Failed to detect Firebase Messaging support', error);
      if (!isMounted) {
        return;
      }

      setIsMessagingSupported(false);
      setPermissionState('unsupported');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isMessagingSupported || !isLoggedIn) {
      setForegroundNotification(null);
      return undefined;
    }

    return subscribeToForegroundMessages(nextNotification => {
      if (nextNotification) {
        setForegroundNotification(nextNotification);
      }
    });
  }, [isMessagingSupported, isLoggedIn]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId || !isMessagingSupported) {
      lastSyncedKeyRef.current = '';
      return;
    }

    if (permissionState === 'default' || permissionState === 'unsupported') {
      return;
    }

    const syncKey = `${currentUserId}:${permissionState}`;
    if (lastSyncedKeyRef.current === syncKey) {
      return;
    }

    let isCancelled = false;

    const syncRegistration = async () => {
      const idToken = await getCurrentUserIdToken();
      if (!idToken || isCancelled) {
        return;
      }

      setIsSyncing(true);
      setSyncError('');

      try {
        await syncBrowserPushRegistration({
          idToken,
          permissionState,
        });

        if (isCancelled) {
          return;
        }

        lastSyncedKeyRef.current = syncKey;
      } catch (error) {
        console.error('Failed to sync push token', error);
        if (!isCancelled) {
          setSyncError(
            error instanceof Error
              ? error.message
              : 'Unable to enable notifications right now.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsSyncing(false);
        }
      }
    };

    void syncRegistration();

    return () => {
      isCancelled = true;
    };
  }, [
    currentUserId,
    isAuthReady,
    isLoggedIn,
    isMessagingSupported,
    permissionState,
  ]);

  const requestPermission = async () => {
    if (!isMessagingSupported) {
      setPermissionState('unsupported');
      return;
    }

    try {
      setSyncError('');
      const nextPermission = await requestBrowserPushPermission();
      setPermissionState(nextPermission);
      setIsPermissionBannerDismissed(false);
      clearPushPermissionBannerDismissal();
    } catch (error) {
      console.error('Notification permission request failed', error);
      setSyncError('Unable to request browser notification permission.');
    }
  };

  const dismissPermissionBanner = () => {
    setIsPermissionBannerDismissed(true);
    dismissPushPermissionBanner();
  };

  const isPermissionBannerVisible = useMemo(
    () =>
      isLoggedIn &&
      isMessagingSupported &&
      permissionState === 'default' &&
      !isPermissionBannerDismissed,
    [isLoggedIn, isMessagingSupported, permissionState, isPermissionBannerDismissed],
  );

  return {
    permissionState,
    isSupported: isMessagingSupported,
    isSyncing,
    syncError,
    isPermissionBannerVisible,
    foregroundNotification,
    requestPermission,
    dismissPermissionBanner,
    dismissForegroundNotification: () => setForegroundNotification(null),
  };
};
