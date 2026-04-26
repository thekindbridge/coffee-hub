import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from 'firebase/messaging';
import { app } from './firebaseConfig';

export type FirebaseMessagingPermissionState =
  | NotificationPermission
  | 'unsupported';

export type FirebaseForegroundNotification = {
  id: string;
  title: string;
  body: string;
  url: string;
};

let messagingSupportPromise: Promise<boolean> | null = null;
let missingVapidKeyLogged = false;

const getMessagingSupport = () => {
  if (!messagingSupportPromise) {
    messagingSupportPromise = isSupported().catch(error => {
      console.error('Failed to detect Firebase Messaging support', error);
      return false;
    });
  }

  return messagingSupportPromise;
};

const getServiceWorkerRegistration = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
};

export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const supported = await getMessagingSupport();
  if (!supported) {
    return null;
  }

  return getMessaging(app);
};

export const requestNotificationPermission = async (): Promise<FirebaseMessagingPermissionState> => {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.requestPermission();
};

export const getDeviceToken = async (): Promise<string> => {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return '';
  }

  const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
  if (!vapidKey) {
    if (!missingVapidKeyLogged) {
      missingVapidKeyLogged = true;
      console.warn('Browser push notifications disabled: VITE_FIREBASE_VAPID_KEY is missing.');
    }
    return '';
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('Push service worker registration failed.');
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  return token.trim();
};

export const parseForegroundNotification = (
  payload: MessagePayload,
): FirebaseForegroundNotification | null => {
  const data = payload.data || {};
  const title = `${data.title || payload.notification?.title || ''}`.trim();
  const body = `${data.body || payload.notification?.body || ''}`.trim();
  const url = `${data.url || ''}`.trim();

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

export const subscribeToMessagingForeground = (
  onData: (notification: FirebaseForegroundNotification | null) => void,
) => {
  let isActive = true;
  let unsubscribe: (() => void) | undefined;

  void getMessagingInstance().then(messaging => {
    if (!isActive || !messaging) {
      return;
    }

    unsubscribe = onMessage(messaging, payload => {
      onData(parseForegroundNotification(payload));
    });
  }).catch(error => {
    console.error('Failed to subscribe to foreground Firebase messages', error);
  });

  return () => {
    isActive = false;
    unsubscribe?.();
  };
};

export const detectFirebaseMessagingSupport = async () => getMessagingSupport();
