import {
  GoogleAuthProvider,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signInWithRedirect,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';

const provider = new GoogleAuthProvider();
const GOOGLE_AUTH_ERROR_KEY = 'coffee_hub_google_auth_error';
const GOOGLE_AUTH_REDIRECT_KEY = 'coffee_hub_google_auth_redirect';
const GOOGLE_AUTH_REDIRECT_NOTICE_KEY = 'coffee_hub_google_auth_redirect_notice';

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
    return new AppServiceError('Popup was blocked, so sign-in is continuing in this tab.', {
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

const beginRedirectSignIn = async (reason = '') => {
  writeStorage(GOOGLE_AUTH_REDIRECT_KEY, '1');
  writeStorage(GOOGLE_AUTH_REDIRECT_NOTICE_KEY, reason);
  writeStorage(GOOGLE_AUTH_ERROR_KEY, '');
  await signInWithRedirect(auth, provider);
};

const clearRedirectState = () => {
  writeStorage(GOOGLE_AUTH_REDIRECT_KEY, '');
  writeStorage(GOOGLE_AUTH_REDIRECT_NOTICE_KEY, '');
};

export const initializeGoogleAuth = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const redirectResult = await getRedirectResult(auth);
    clearRedirectState();
    writeStorage(GOOGLE_AUTH_ERROR_KEY, '');
    return redirectResult?.user || null;
  } catch (error) {
    clearRedirectState();
    const appError = mapGoogleAuthError(error);
    writeStorage(GOOGLE_AUTH_ERROR_KEY, appError.message);
    throw appError;
  }
};

export const consumeGoogleAuthNotice = () => {
  const message = readStorage(GOOGLE_AUTH_REDIRECT_NOTICE_KEY);
  writeStorage(GOOGLE_AUTH_REDIRECT_NOTICE_KEY, '');
  return message;
};

export const consumeGoogleAuthError = () => {
  const message = readStorage(GOOGLE_AUTH_ERROR_KEY);
  writeStorage(GOOGLE_AUTH_ERROR_KEY, '');
  return message;
};

export const loginWithGoogle = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);

    if (prefersRedirectFlow()) {
      await beginRedirectSignIn('Continuing Google sign-in in this tab...');
      return null;
    }

    const result = await signInWithPopup(auth, provider);
    clearRedirectState();
    writeStorage(GOOGLE_AUTH_ERROR_KEY, '');
    return result.user;
  } catch (error) {
    if (isPopupFallbackError(error)) {
      await beginRedirectSignIn('Popup was blocked, so sign-in is continuing in this tab...');
      return null;
    }

    if (getGoogleAuthErrorCode(error) === 'auth/popup-closed-by-user') {
      clearRedirectState();
    }

    const appError = mapGoogleAuthError(error);
    writeStorage(GOOGLE_AUTH_ERROR_KEY, appError.message);
    throw appError;
  }
};
