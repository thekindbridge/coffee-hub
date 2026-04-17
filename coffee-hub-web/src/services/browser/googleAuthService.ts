import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  setPersistence,
  signInWithRedirect,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { FIREBASE_AUTH_DOMAIN } from '../firebase/firebaseConfig';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';

const provider = new GoogleAuthProvider();
const GOOGLE_AUTH_REDIRECT_KEY = 'coffee_hub_google_auth_redirect';
const GOOGLE_AUTH_REDIRECT_STARTED_AT_KEY = 'coffee_hub_google_auth_redirect_started_at';
let redirectResultInspectionPromise: Promise<void> | null = null;

provider.setCustomParameters({
  prompt: 'select_account',
});

const isBrowser = () => typeof window !== 'undefined';

const readStorage = (key: string) => {
  if (!isBrowser()) {
    return '';
  }

  return window.sessionStorage.getItem(key) || '';
};

const writeStorage = (key: string, value: string) => {
  if (!isBrowser()) {
    return;
  }

  if (value) {
    window.sessionStorage.setItem(key, value);
    return;
  }

  window.sessionStorage.removeItem(key);
};

const hasPendingRedirectAttempt = () => readStorage(GOOGLE_AUTH_REDIRECT_KEY) === '1';

const getPendingRedirectStartedAt = () => {
  const startedAt = Number(readStorage(GOOGLE_AUTH_REDIRECT_STARTED_AT_KEY));
  return Number.isFinite(startedAt) && startedAt > 0 ? startedAt : 0;
};

const prefersRedirectFlow = () => {
  if (!isBrowser()) {
    return false;
  }

  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const isMobileUserAgent = /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);

  return isStandalone || hasCoarsePointer || isMobileUserAgent;
};

const getGoogleAuthErrorCode = (error: unknown) => (
  error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : ''
);

const isPopupFallbackError = (error: unknown) => [
  'auth/popup-blocked',
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

const beginRedirectSignIn = async () => {
  await ensureBrowserLocalPersistence();
  writeStorage(GOOGLE_AUTH_REDIRECT_KEY, '1');
  writeStorage(GOOGLE_AUTH_REDIRECT_STARTED_AT_KEY, `${Date.now()}`);
  console.log('GOOGLE AUTH: redirect sign-in start', {
    authDomain: FIREBASE_AUTH_DOMAIN,
    returnUrl: window.location.href,
  });
  await signInWithRedirect(auth, provider);
};

const clearRedirectState = () => {
  writeStorage(GOOGLE_AUTH_REDIRECT_KEY, '');
  writeStorage(GOOGLE_AUTH_REDIRECT_STARTED_AT_KEY, '');
};

export const initializeGoogleAuth = async () => {
  if (!isBrowser()) {
    return;
  }

  if (!redirectResultInspectionPromise) {
    redirectResultInspectionPromise = (async () => {
      const redirectAttempted = hasPendingRedirectAttempt();
      const redirectStartedAt = getPendingRedirectStartedAt();
      console.log('AUTH START', {
        authDomain: FIREBASE_AUTH_DOMAIN,
        currentUrl: window.location.href,
        redirectAttempted,
      });

      try {
        const redirectResult = await getRedirectResult(auth);
        const resolvedInMs = redirectStartedAt > 0 ? Date.now() - redirectStartedAt : 0;

        if (redirectResult?.user) {
          console.log('GOOGLE AUTH: redirect result received', {
            uid: redirectResult.user.uid,
            email: redirectResult.user.email || '',
            resolvedInMs,
          });
          return;
        }

        if (redirectAttempted) {
          console.log('GOOGLE AUTH: redirect completed without direct result, waiting for auth state', {
            resolvedInMs,
          });
        }
      } catch (error) {
        console.warn('GOOGLE AUTH: redirect result inspection failed', {
          error,
          code: getGoogleAuthErrorCode(error),
        });
      } finally {
        clearRedirectState();
      }
    })();
  }

  return redirectResultInspectionPromise;
};

export const loginWithGoogle = async () => {
  try {
    if (prefersRedirectFlow()) {
      await beginRedirectSignIn();
      return null;
    }

    await ensureBrowserLocalPersistence();
    const result = await signInWithPopup(auth, provider);
    clearRedirectState();
    return result.user;
  } catch (error) {
    if (isPopupFallbackError(error)) {
      await beginRedirectSignIn();
      return null;
    }

    if (getGoogleAuthErrorCode(error) === 'auth/popup-closed-by-user') {
      clearRedirectState();
    }

    throw mapGoogleAuthError(error);
  }
};
