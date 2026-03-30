import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { AppServiceError } from '../serviceError';

type ReactNativeAuthModule = {
  getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
  initializeAuth: (
    app: FirebaseApp,
    deps?: { persistence?: unknown },
  ) => Auth;
};

const readEnvValue = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const getRequiredEnv = (label: string, ...keys: string[]) => {
  const value = readEnvValue(...keys);
  if (!value) {
    throw new AppServiceError(
      `Missing Firebase environment variable: ${label}.`,
      { code: 'unsupported' },
    );
  }

  return value;
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

const getReactNativeAuthModule = (): ReactNativeAuthModule => (
  require('@firebase/auth') as ReactNativeAuthModule
);

export const getFirebaseApp = (): FirebaseApp => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const firebaseConfig = {
    apiKey: getRequiredEnv(
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'VITE_API_KEY',
      'VITE_FIREBASE_API_KEY',
    ),
    authDomain: getRequiredEnv(
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'VITE_AUTH_DOMAIN',
      'VITE_FIREBASE_AUTH_DOMAIN',
    ),
    projectId: getRequiredEnv(
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'VITE_PROJECT_ID',
      'VITE_FIREBASE_PROJECT_ID',
    ),
    storageBucket: getRequiredEnv(
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'VITE_STORAGE_BUCKET',
      'VITE_FIREBASE_STORAGE_BUCKET',
    ),
    messagingSenderId: getRequiredEnv(
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
    ),
    appId: getRequiredEnv(
      'EXPO_PUBLIC_FIREBASE_APP_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
      'VITE_APP_ID',
      'VITE_FIREBASE_APP_ID',
    ),
  };

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return firebaseApp;
};

export const getFirebaseAuth = (): Auth => {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  const app = getFirebaseApp();
  const { getReactNativePersistence, initializeAuth } = getReactNativeAuthModule();
  firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  return firebaseAuth;
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

export const auth = getFirebaseAuth();
