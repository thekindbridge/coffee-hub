import {
  browserLocalPersistence,
  onIdTokenChanged,
  setPersistence,
  signOut,
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
    authBootstrapPromise = (async () => {
      console.log('AUTH BOOTSTRAP: initialize');
      await initializeAuthSession();
      await initializeGoogleAuth();

      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken();
          console.log('AUTH BOOTSTRAP: current user token ready', {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || '',
          });
        } catch (error) {
          console.warn('AUTH BOOTSTRAP: token refresh failed', error);
        }
      }
    })().catch(error => {
      authBootstrapPromise = null;
      throw error;
    });
  }

  return authBootstrapPromise;
};

export const getAuthSessionSnapshot = (): AuthSessionSnapshot => {
  const user = auth.currentUser;

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

export const subscribeToAuthSession = (
  listener: (snapshot: AuthSessionSnapshot) => void,
) => {
  void initializeAuthState().catch(() => undefined);

  return onIdTokenChanged(auth, user => {
    console.log('AUTH STATE:', user);

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
