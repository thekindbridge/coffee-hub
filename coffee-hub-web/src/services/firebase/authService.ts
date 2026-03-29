import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { toAppServiceError } from '../platform/serviceError';
import { auth } from './firebaseConfig';

const provider = new GoogleAuthProvider();

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw toAppServiceError(error, 'Unable to sign in with Google.', 'network');
  }
};

export const subscribeToAuthSession = (
  listener: (snapshot: AuthSessionSnapshot) => void,
) => onAuthStateChanged(auth, user => {
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
