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
  // Keep Firestore in memory for the mobile app while we debug connectivity.
  // This avoids persistent offline cache behavior blocking fresh verification.
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
};

const sanitizeFirebaseConfigForLog = () => ({
  appIdSuffix: firebaseConfig.appId.slice(-8),
  authDomain: firebaseConfig.authDomain,
  hasApiKey: Boolean(firebaseConfig.apiKey),
  messagingSenderId: firebaseConfig.messagingSenderId,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
});

const hasExistingFirebaseApp = getApps().length > 0;

let firebaseApp: FirebaseApp = hasExistingFirebaseApp ? getApp() : initializeApp(firebaseConfig);
let firestoreDb: Firestore | null = null;

console.log('[firebaseConfig] app:init', {
  appCount: getApps().length,
  reusedExistingApp: hasExistingFirebaseApp,
  ...sanitizeFirebaseConfigForLog(),
});

export const app = firebaseApp;

export const getFirebaseApp = (): FirebaseApp => app;

export const getFirebaseDb = (): Firestore => {
  if (firestoreDb) {
    console.log('[firebaseConfig] firestore:reuse');
    return firestoreDb;
  }

  try {
    console.log('[firebaseConfig] firestore:initialize:start', FIRESTORE_INIT_SETTINGS);
    firestoreDb = initializeFirestore(app, FIRESTORE_INIT_SETTINGS);
    console.log('[firebaseConfig] firestore:initialize:success');
  } catch (error) {
    console.warn('[firebaseConfig] firestore:initialize:fallback', error);
    firestoreDb = getFirestore(app);
  }

  return firestoreDb ?? getFirestore(app);
};
