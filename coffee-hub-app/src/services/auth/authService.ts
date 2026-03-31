import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import { toAppServiceError } from '../serviceError';
import { auth } from '../firebase/firebaseConfig';

export type AuthUser = User;

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
  user: AuthUser | null;
};

const buildSnapshot = (user: AuthUser | null): AuthSessionSnapshot => ({
  currentUserEmail: user?.email || '',
  currentUserId: user?.uid || '',
  isLoggedIn: Boolean(user),
  user,
});

export const subscribeToAuthSession = (
  listener: (snapshot: AuthSessionSnapshot) => void,
) => onAuthStateChanged(auth, user => {
  listener(buildSnapshot(user));
});

export const getCurrentAuthUser = (): AuthUser | null => auth.currentUser;

export const getCurrentUserIdToken = async (forceRefresh = false) => {
  try {
    return auth.currentUser?.getIdToken(forceRefresh) || '';
  } catch (error) {
    throw toAppServiceError(error, 'Unable to refresh your secure session.', 'network');
  }
};

export const logoutCurrentUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw toAppServiceError(error, 'Unable to log out right now.', 'network');
  }
};
