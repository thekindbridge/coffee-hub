import { signOut } from 'firebase/auth';
import { safeNormalizePhoneNumber } from '../../../shared/phone';
import { auth } from '../firebase';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';

export type AuthSessionSnapshot = {
  currentUserId: string;
  currentUserPhone: string;
  isLoggedIn: boolean;
};

const ensureAuthenticatedUser = () => {
  if (!auth.currentUser) {
    throw new AppServiceError('Authentication is still loading. Please try again.', {
      code: 'validation',
    });
  }

  return auth.currentUser;
};

const toFirebaseAuthError = (
  error: unknown,
  fallbackMessage: string,
  code: 'network' | 'permission' | 'unsupported' | 'validation' = 'network',
) => toAppServiceError(error, fallbackMessage, code);

export const getAuthSessionSnapshot = (): AuthSessionSnapshot => ({
  currentUserId: auth.currentUser?.uid || '',
  currentUserPhone: safeNormalizePhoneNumber(auth.currentUser?.phoneNumber || ''),
  isLoggedIn: Boolean(auth.currentUser?.uid),
});

export const getCurrentUserIdToken = async (forceRefresh = false) => {
  const currentUser = ensureAuthenticatedUser();

  if (!currentUser.uid) {
    return '';
  }

  try {
    return await currentUser.getIdToken(forceRefresh);
  } catch (error) {
    throw toFirebaseAuthError(error, 'Unable to refresh your session.');
  }
};

export const logoutCurrentUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw toFirebaseAuthError(error, 'Unable to log out right now.');
  }
};

export const getCurrentUserPhone = () =>
  safeNormalizePhoneNumber(auth.currentUser?.phoneNumber || '');
