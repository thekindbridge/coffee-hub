import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from 'firebase/auth';
import { toAppServiceError } from '../serviceError';
import { auth } from './firebaseConfig';

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
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

export const getCurrentAuthUser = (): User | null => auth.currentUser;

export const getCurrentUserIdToken = async (forceRefresh = false) => {
  try {
    return auth.currentUser?.getIdToken(forceRefresh) || '';
  } catch (error) {
    throw toAppServiceError(error, 'Unable to refresh your session.', 'network');
  }
};

type GoogleTokenInput = {
  accessToken?: string;
  idToken?: string;
};

export const signInWithGoogleTokens = async ({
  accessToken = '',
  idToken = '',
}: GoogleTokenInput) => {
  const normalizedAccessToken = accessToken.trim();
  const normalizedIdToken = idToken.trim();

  if (!normalizedIdToken && !normalizedAccessToken) {
    throw toAppServiceError(
      new Error('Google ID token or access token is required to complete sign-in.'),
      'Unable to sign in with Google.',
      'validation',
    );
  }

  try {
    const credential = GoogleAuthProvider.credential(
      normalizedIdToken || null,
      normalizedAccessToken || null,
    );
    await signInWithCredential(auth, credential);
  } catch (error) {
    throw toAppServiceError(error, 'Unable to sign in with Google.', 'network');
  }
};

export const signInWithGoogleIdToken = async (idToken: string) => {
  await signInWithGoogleTokens({ idToken });
};

export const logoutCurrentUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw toAppServiceError(error, 'Unable to log out right now.', 'network');
  }
};
