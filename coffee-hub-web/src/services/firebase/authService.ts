import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut,
  type User,
} from 'firebase/auth';
import { initializeGoogleAuth } from '../browser/googleAuthService';
import { toAppServiceError } from '../platform/serviceError';
import { auth } from './firebaseConfig';

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
};

let authInitializationPromise: Promise<void> | null = null;
let authBootstrapPromise: Promise<void> | null = null;

const createAuthSessionSnapshot = (user: User | null): AuthSessionSnapshot => {
  if (!user) {
    return {
      currentUserEmail: '',
      currentUserId: '',
      isLoggedIn: false,
    };
  }

  return {
    currentUserEmail: user.email || '',
    currentUserId: user.uid,
    isLoggedIn: true,
  };
};

export const initializeAuthSession = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!authInitializationPromise) {
    authInitializationPromise = setPersistence(auth, browserLocalPersistence)
      .then(() => undefined)
      .catch(error => {
        authInitializationPromise = null;
        throw toAppServiceError(error, 'Unable to restore your session.', 'network');
      });
  }

  return authInitializationPromise;
};

export const initializeAuthState = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!authBootstrapPromise) {
    authBootstrapPromise = initializeAuthSession()
      .then(() => {
        void initializeGoogleAuth();
      })
      .catch(error => {
        authBootstrapPromise = null;
        throw error;
      });
  }

  return authBootstrapPromise;
};

export const getAuthSessionSnapshot = (): AuthSessionSnapshot => {
  return createAuthSessionSnapshot(auth.currentUser);
};

export const subscribeToAuthSession = (
  listener: (snapshot: AuthSessionSnapshot) => void,
) => {
  void initializeAuthState().catch(error => {
    console.warn('AUTH INIT FAILED', error);
  });

  return onAuthStateChanged(auth, user => {
    listener(createAuthSessionSnapshot(user));
  });
};

export const getCurrentUserIdToken = async (forceRefresh = false) => {
  try {
    return auth.currentUser?.getIdToken(forceRefresh) || '';
  } catch (error) {
    throw toAppServiceError(error, 'Unable to refresh your session.', 'network');
  }
};

export const logoutCurrentUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw toAppServiceError(error, 'Unable to log out right now.', 'network');
  }
};
