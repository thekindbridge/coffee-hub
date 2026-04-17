import {
  browserLocalPersistence,
  onIdTokenChanged,
  setPersistence,
  signOut,
} from 'firebase/auth';
import { toAppServiceError } from '../platform/serviceError';
import { auth } from './firebaseConfig';

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
};

let authInitializationPromise: Promise<void> | null = null;

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

export const subscribeToAuthSession = (
  listener: (snapshot: AuthSessionSnapshot) => void,
) => {
  void initializeAuthSession().catch(() => undefined);

  return onIdTokenChanged(auth, user => {
  if (!user) {
    listener({
      currentUserEmail: '',
      currentUserId: '',
      isLoggedIn: false,
    });
    return;
  }

  listener({
    currentUserEmail: user.email || '',
    currentUserId: user.uid,
    isLoggedIn: true,
  });
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
