import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import { app, auth } from '../../../services/firebase';
import { postApi } from '../../../utils/apiClient';
import type { PushPermissionState } from '../../../components/NotificationSettingsPanel';

type ForegroundNotification = {
  id: string;
  title: string;
  body: string;
  url: string;
};

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

const PUSH_PROMPT_DISMISS_KEY = 'coffee_hub_push_prompt_dismissed';

const getBrowserPermissionState = (): PushPermissionState => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
};

const parseForegroundMessage = (
  payload: MessagePayload,
): ForegroundNotification | null => {
  const data = payload.data || {};
  const title = (data.title || payload.notification?.title || '').trim();
  const body = (data.body || payload.notification?.body || '').trim();
  const url = (data.url || '').trim();

  if (!title && !body) {
    return null;
  }

  return {
    id: `${Date.now()}`,
    title: title || 'Coffee HUB',
    body,
    url,
  };
};

const getPushServiceWorkerRegistration = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration('/');
  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register('/sw.js');
};

export const usePushNotifications = ({
  isAuthReady,
  isLoggedIn,
  currentUserId,
}: UsePushNotificationsParams): PushNotificationsState => {
  const [permissionState, setPermissionState] = useState<PushPermissionState>(
    getBrowserPermissionState(),
  );
  const [isMessagingSupported, setIsMessagingSupported] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [foregroundNotification, setForegroundNotification] =
    useState<ForegroundNotification | null>(null);
  const [isPermissionBannerDismissed, setIsPermissionBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(PUSH_PROMPT_DISMISS_KEY) === 'true';
  });
  const lastSyncedKeyRef = useRef('');

  useEffect(() => {
    let isMounted = true;

    void isSupported().then(supported => {
      if (!isMounted) {
        return;
      }

      setIsMessagingSupported(supported);
      setPermissionState(supported ? getBrowserPermissionState() : 'unsupported');
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

    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, payload => {
      const nextNotification = parseForegroundMessage(payload);
      if (!nextNotification) {
        return;
      }

      setForegroundNotification(nextNotification);
    });

    return () => {
      unsubscribe();
    };
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
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken || isCancelled) {
        return;
      }

      setIsSyncing(true);
      setSyncError('');

      try {
        let token = '';

        if (permissionState === 'granted') {
          const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
          if (!vapidKey) {
            throw new Error('VITE_FIREBASE_VAPID_KEY is missing.');
          }

          const registration = await getPushServiceWorkerRegistration();
          if (!registration) {
            throw new Error('Push service worker registration failed.');
          }

          token = await getToken(getMessaging(app), {
            vapidKey,
            serviceWorkerRegistration: registration,
          });

          if (!token) {
            throw new Error('Browser did not return an FCM token.');
          }
        }

        if (isCancelled) {
          return;
        }

        await postApi(
          '/api/notifications/register-token',
          {
            permission: permissionState,
            token,
          },
          idToken,
        );

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
    if (!isMessagingSupported || typeof Notification === 'undefined') {
      setPermissionState('unsupported');
      return;
    }

    try {
      setSyncError('');
      const nextPermission = await Notification.requestPermission();
      setPermissionState(nextPermission);
      setIsPermissionBannerDismissed(false);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PUSH_PROMPT_DISMISS_KEY);
      }
    } catch (error) {
      console.error('Notification permission request failed', error);
      setSyncError('Unable to request browser notification permission.');
    }
  };

  const dismissPermissionBanner = () => {
    setIsPermissionBannerDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, 'true');
    }
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
