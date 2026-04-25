import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;

const readEnvValue = (...keys: string[]) => {
  for (const key of keys) {
    const viteValue = import.meta.env?.[key as keyof ImportMetaEnv];
    if (typeof viteValue === 'string' && viteValue.trim()) {
      return viteValue.trim();
    }

    const processValue = nodeEnv?.[key];
    if (typeof processValue === 'string' && processValue.trim()) {
      return processValue.trim();
    }
  }

  return '';
};

const getRequiredEnv = (label: string, ...keys: string[]) => {
  const value = readEnvValue(...keys);
  if (!value) {
    throw new Error(
      `Missing Firebase environment variable: ${label}. Checked ${keys.join(', ')}.`,
    );
  }

  return value;
};

const firebaseConfig = {
  apiKey: getRequiredEnv('VITE_API_KEY', 'VITE_API_KEY', 'VITE_FIREBASE_API_KEY'),
  authDomain: getRequiredEnv(
    'VITE_AUTH_DOMAIN',
    'VITE_AUTH_DOMAIN',
    'VITE_FIREBASE_AUTH_DOMAIN',
  ),
  projectId: getRequiredEnv('VITE_PROJECT_ID', 'VITE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getRequiredEnv(
    'VITE_STORAGE_BUCKET',
    'VITE_STORAGE_BUCKET',
    'VITE_FIREBASE_STORAGE_BUCKET',
  ),
  messagingSenderId: getRequiredEnv(
    'VITE_MESSAGING_SENDER_ID',
    'VITE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
  ),
  appId: getRequiredEnv('VITE_APP_ID', 'VITE_APP_ID', 'VITE_FIREBASE_APP_ID'),
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = (() => {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      ],
    });
  } catch {
    return getAuth(app);
  }
})();
export const db = getFirestore(app);
