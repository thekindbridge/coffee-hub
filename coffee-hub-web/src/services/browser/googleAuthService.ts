import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  setPersistence,
  signInWithRedirect,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';

const provider = new GoogleAuthProvider();
let redirectResultInspectionPromise: Promise<void> | null = null;

provider.setCustomParameters({
  prompt: 'select_account',
});

const isBrowser = () => typeof window !== 'undefined';

const getGoogleAuthErrorCode = (error: unknown) => (
  error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : ''
);

const shouldFallbackToRedirect = (error: unknown) => [
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/operation-not-supported-in-this-environment',
].includes(getGoogleAuthErrorCode(error));

const mapGoogleAuthError = (error: unknown) => {
  const code = getGoogleAuthErrorCode(error);

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return new AppServiceError('Google sign-in was cancelled.', { cause: error, code: 'validation' });
  }

  if (code === 'auth/popup-blocked') {
    return new AppServiceError('Popup was blocked during Google sign-in.', {
      cause: error,
      code: 'unsupported',
    });
  }

  if (code === 'auth/network-request-failed') {
    return new AppServiceError('Network error while signing in with Google.', {
      cause: error,
      code: 'network',
    });
  }

  if (code === 'auth/unauthorized-domain') {
    return new AppServiceError('This domain is not authorized for Firebase Google sign-in.', {
      cause: error,
      code: 'permission',
    });
  }

  return toAppServiceError(error, 'Unable to sign in with Google.', 'network');
};

const ensureBrowserLocalPersistence = async () => {
  await setPersistence(auth, browserLocalPersistence);
};

export const initializeGoogleAuth = async () => {
  if (!isBrowser()) {
    return;
  }

  if (!redirectResultInspectionPromise) {
    redirectResultInspectionPromise = (async () => {
      try {
        await ensureBrowserLocalPersistence();
        const redirectResult = await getRedirectResult(auth);

        console.log('GOOGLE AUTH: redirect inspection', {
          hasRedirectUser: Boolean(redirectResult?.user),
          redirectUserUid: redirectResult?.user?.uid || '',
          currentUserUid: auth.currentUser?.uid || '',
        });
      } catch (error) {
        console.warn('GOOGLE AUTH: redirect result inspection failed', {
          error,
          code: getGoogleAuthErrorCode(error),
        });
      }
    })();
  }

  return redirectResultInspectionPromise;
};

export const signInWithGoogle = async () => {
  await ensureBrowserLocalPersistence();

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    if (shouldFallbackToRedirect(error)) {
      try {
        await signInWithRedirect(auth, provider);
        return null;
      } catch (redirectError) {
        throw mapGoogleAuthError(redirectError);
      }
    }

    throw mapGoogleAuthError(error);
  }
};

export const loginWithGoogle = signInWithGoogle;
