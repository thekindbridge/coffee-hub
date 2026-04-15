import type { FirebaseApp } from 'firebase/app';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBi7bFAifGAe2Si82WUxn0caebJ4MQky3g',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'coffee-hub-c8fdb.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'coffee-hub-c8fdb',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'coffee-hub-c8fdb.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '490208209104',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:490208209104:web:0ec7e53fd1667afc89d6d5',
};

const FIRESTORE_INIT_SETTINGS = {
  // Use an in-memory cache so Expo sessions always reflect the latest server state.
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
};

const hasExistingFirebaseApp = getApps().length > 0;

let firebaseApp: FirebaseApp = hasExistingFirebaseApp ? getApp() : initializeApp(firebaseConfig);
let firestoreDb: Firestore | null = null;

export const app = firebaseApp;

export const getFirebaseApp = (): FirebaseApp => app;

export const getFirebaseDb = (): Firestore => {
  if (firestoreDb) {
    return firestoreDb;
  }

  try {
    firestoreDb = initializeFirestore(app, FIRESTORE_INIT_SETTINGS);
  } catch {
    firestoreDb = getFirestore(app);
  }

  return firestoreDb ?? getFirestore(app);
};
