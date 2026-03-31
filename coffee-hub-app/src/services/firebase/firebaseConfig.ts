import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuthModule from 'firebase/auth';
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Dependencies,
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBi7bFAifGAe2Si82WUxn0caebJ4MQky3g',
  authDomain: 'coffee-hub-c8fdb.firebaseapp.com',
  projectId: 'coffee-hub-c8fdb',
  storageBucket: 'coffee-hub-c8fdb.firebasestorage.app',
  messagingSenderId: '490208209104',
  appId: '1:490208209104:web:0ec7e53fd1667afc89d6d5',
};

let firebaseApp: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
let firestoreDb: Firestore | null = null;

const getReactNativePersistence = (
  FirebaseAuthModule as typeof FirebaseAuthModule & {
    getReactNativePersistence: (
      storage: typeof AsyncStorage,
    ) => Dependencies['persistence'];
  }
).getReactNativePersistence;

export const app = firebaseApp;

const createAuth = (): Auth => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    const typedError = error as { code?: string };
    if (typedError?.code === 'auth/already-initialized') {
      return getAuth(app);
    }

    throw error;
  }
};

export const auth = createAuth();

export const getFirebaseApp = (): FirebaseApp => app;

export const getFirebaseDb = (): Firestore => {
  if (firestoreDb) {
    return firestoreDb;
  }

  try {
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    firestoreDb = getFirestore(app);
  }

  return firestoreDb ?? getFirestore(app);
};
