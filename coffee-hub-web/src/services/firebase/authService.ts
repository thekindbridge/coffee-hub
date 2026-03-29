import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

const provider = new GoogleAuthProvider();

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
};

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  return result.user;
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

export const getCurrentUserIdToken = async (forceRefresh = false) =>
  auth.currentUser?.getIdToken(forceRefresh) || '';

export const logoutCurrentUser = () => signOut(auth);
