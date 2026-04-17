import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import { app } from '../firebase';
import { registerPushToken } from '../api/notificationsService';
import {
  notificationAdapter,
  type NotificationPermissionState,
} from '../platform/notificationAdapter';
import { toAppServiceError } from '../platform/serviceError';
import { storageAdapter } from '../platform/storageAdapter';

export type PushPermissionState = NotificationPermissionState;

export type ForegroundNotification = {
  id: string;
  title: string;
  body: string;
  url: string;
};

const PUSH_PROMPT_DISMISS_KEY = 'coffee_hub_push_prompt_dismissed';
let hasWarnedAboutMissingVapidKey = false;

export const getBrowserPushPermissionState = (): PushPermissionState => {
  return notificationAdapter.getPermissionState();
};

export const detectBrowserMessagingSupport = async () => {
  try {
    return await isSupported();
  } catch (error) {
    console.error('Failed to detect Firebase Messaging support', error);
    return false;
  }
};

export const parseForegroundMessage = (
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
    title: title || 'COFFEE-HUB',
    body,
    url,
  };
};

export const subscribeToForegroundMessages = (
  onData: (notification: ForegroundNotification | null) => void,
) => {
  const messaging = getMessaging(app);

  return onMessage(messaging, payload => {
    onData(parseForegroundMessage(payload));
  });
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

export const syncBrowserPushRegistration = async ({
  idToken,
  permissionState,
}: {
  idToken: string;
  permissionState: Exclude<PushPermissionState, 'unsupported' | 'default'>;
}) => {
  try {
    let token = '';

    if (permissionState === 'granted') {
      const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
      if (!vapidKey) {
        if (!hasWarnedAboutMissingVapidKey) {
          hasWarnedAboutMissingVapidKey = true;
          console.warn('Browser push notifications disabled: VITE_FIREBASE_VAPID_KEY is missing.');
        }
      } else {
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
    }

    await registerPushToken(
      {
        permission: permissionState,
        token,
      },
      idToken,
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to enable browser notifications right now.',
      'network',
    );
  }
};

export const requestBrowserPushPermission = async (): Promise<PushPermissionState> => {
  return notificationAdapter.requestPermission();
};

export const isPushPermissionBannerDismissed = () =>
  storageAdapter.read(PUSH_PROMPT_DISMISS_KEY) === 'true';

export const dismissPushPermissionBanner = () => {
  storageAdapter.write(PUSH_PROMPT_DISMISS_KEY, 'true');
};

export const clearPushPermissionBannerDismissal = () => {
  storageAdapter.remove(PUSH_PROMPT_DISMISS_KEY);
};
