import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { AppServiceError } from '../serviceError';

const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppServiceError(
      `Missing Firebase environment variable: ${key}. Add it to coffee-hub-app/.env.`,
      { code: 'unsupported' },
    );
  }

  return value.trim();
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const firebaseConfig = {
    apiKey: getRequiredEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getRequiredEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getRequiredEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getRequiredEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getRequiredEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getRequiredEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  };

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return firebaseApp;
};

export const getFirebaseDb = (): Firestore => {
  if (firestoreDb) {
    return firestoreDb;
  }

  const app = getFirebaseApp();

  try {
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    firestoreDb = getFirestore(app);
  }

  return firestoreDb ?? getFirestore(app);
};
