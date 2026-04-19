import { Capacitor } from '@capacitor/core';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
};

type ClerkErrorEntry = {
  code?: string;
  longMessage?: string;
  message?: string;
  meta?: Record<string, unknown>;
};

type ClerkErrorShape = {
  errors?: ClerkErrorEntry[];
  message?: string;
};

export type GoogleAuthRedirectUrls = {
  redirectUrl: string;
  redirectUrlComplete: string;
};

type ClerkTokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;
type ClerkSignOut = () => Promise<void>;

type ClerkAuthRuntime = {
  currentUserEmail: string;
  currentUserId: string;
  getToken: ClerkTokenGetter;
  isLoaded: boolean;
  isLoggedIn: boolean;
  signOut: ClerkSignOut;
};

let authRuntime: ClerkAuthRuntime | null = null;

const AUTH_CALLBACK_QUERY_KEY = 'auth_callback';
const GOOGLE_AUTH_CALLBACK_VALUE = 'google';
const CAPACITOR_AUTH_CALLBACK_URL = 'com.coffeehub.app://auth/callback';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getFirstClerkError = (error: unknown): ClerkErrorEntry | null => {
  if (
    error &&
    typeof error === 'object' &&
    Array.isArray((error as ClerkErrorShape).errors) &&
    (error as ClerkErrorShape).errors.length > 0
  ) {
    return (error as ClerkErrorShape).errors?.[0] ?? null;
  }

  return null;
};

const getCurrentUrl = (url?: string) => {
  if (url) {
    return new URL(url);
  }

  if (typeof window !== 'undefined') {
    return new URL(window.location.href);
  }

  return new URL('https://coffee-hub.local/');
};

const buildWebCallbackUrl = (url?: string) => {
  const activeUrl = getCurrentUrl(url);
  activeUrl.hash = '';

  const redirectUrlComplete = new URL(activeUrl.toString());
  redirectUrlComplete.searchParams.delete(AUTH_CALLBACK_QUERY_KEY);

  const redirectUrl = new URL(redirectUrlComplete.toString());
  redirectUrl.searchParams.set(AUTH_CALLBACK_QUERY_KEY, GOOGLE_AUTH_CALLBACK_VALUE);

  return {
    redirectUrl,
    redirectUrlComplete,
  };
};

const ensureAuthRuntime = () => {
  if (!authRuntime?.isLoaded) {
    throw new AppServiceError('Authentication is still loading. Please try again.', {
      code: 'validation',
    });
  }

  return authRuntime;
};

const toClerkAuthError = (
  error: unknown,
  fallbackMessage: string,
  code: 'network' | 'permission' | 'unsupported' | 'validation' = 'network',
) => toAppServiceError(error, fallbackMessage, code);

export const syncAuthRuntime = (runtime: ClerkAuthRuntime | null) => {
  authRuntime = runtime;
};

export const normalizeAuthEmail = (value: string) => normalizeEmail(value);

export const isValidAuthEmail = (value: string) => {
  const normalized = normalizeAuthEmail(value);

  return Boolean(normalized) && normalized.includes('@') && emailPattern.test(normalized);
};

export const isNativeAuthPlatform = () => Capacitor.isNativePlatform();

export const getClerkErrorMessage = (error: unknown, fallback: string) => {
  const firstError = getFirstClerkError(error);

  switch (firstError?.code) {
    case 'form_param_format_invalid':
      return 'Enter a valid email address.';
    case 'form_identifier_not_found':
      return 'We could not find an account for that email address.';
    case 'verification_failed':
      return 'That code is incorrect. Check it and try again.';
    case 'verification_expired':
      return 'That code expired. Request a new one and try again.';
    case 'network_error':
      return 'Network error. Check your connection and try again.';
    default:
      break;
  }

  if (firstError?.longMessage) {
    return firstError.longMessage;
  }

  if (firstError?.message) {
    return firstError.message;
  }

  if (error && typeof error === 'object' && typeof (error as ClerkErrorShape).message === 'string') {
    return (error as ClerkErrorShape).message as string;
  }

  return fallback;
};

export const getGoogleAuthRedirectUrls = (url?: string): GoogleAuthRedirectUrls => {
  const { redirectUrl, redirectUrlComplete } = buildWebCallbackUrl(url);

  if (isNativeAuthPlatform() && redirectUrl.protocol !== 'https:') {
    const nativeRedirectUrl = new URL(CAPACITOR_AUTH_CALLBACK_URL);
    redirectUrl.searchParams.forEach((value, key) => {
      nativeRedirectUrl.searchParams.set(key, value);
    });

    return {
      redirectUrl: nativeRedirectUrl.toString(),
      redirectUrlComplete: redirectUrlComplete.toString(),
    };
  }

  return {
    redirectUrl: redirectUrl.toString(),
    redirectUrlComplete: redirectUrlComplete.toString(),
  };
};

export const isGoogleAuthCallbackUrl = (url?: string) =>
  getCurrentUrl(url).searchParams.get(AUTH_CALLBACK_QUERY_KEY) === GOOGLE_AUTH_CALLBACK_VALUE;

export const clearGoogleAuthCallbackUrl = (url?: string) => {
  const activeUrl = getCurrentUrl(url);
  activeUrl.searchParams.delete(AUTH_CALLBACK_QUERY_KEY);

  return activeUrl.toString();
};

export const resolveIncomingAuthUrl = (incomingUrl: string, currentUrl?: string) => {
  const activeUrl = getCurrentUrl(currentUrl);
  const parsedIncomingUrl = new URL(incomingUrl);

  if (parsedIncomingUrl.protocol === 'http:' || parsedIncomingUrl.protocol === 'https:') {
    return parsedIncomingUrl.toString();
  }

  if (
    parsedIncomingUrl.protocol === 'com.coffeehub.app:' &&
    parsedIncomingUrl.hostname === 'auth' &&
    parsedIncomingUrl.pathname === '/callback'
  ) {
    const resolvedUrl = buildWebCallbackUrl(activeUrl.toString()).redirectUrlComplete;
    parsedIncomingUrl.searchParams.forEach((value, key) => {
      resolvedUrl.searchParams.set(key, value);
    });

    return resolvedUrl.toString();
  }

  return null;
};

export const getAuthSessionSnapshot = (): AuthSessionSnapshot => ({
  currentUserEmail: authRuntime?.currentUserEmail || '',
  currentUserId: authRuntime?.currentUserId || '',
  isLoggedIn: Boolean(authRuntime?.isLoggedIn && authRuntime.currentUserId),
});

export const getCurrentUserIdToken = async (forceRefresh = false) => {
  const runtime = ensureAuthRuntime();

  if (!runtime.isLoggedIn) {
    return '';
  }

  try {
    return (await runtime.getToken({ skipCache: forceRefresh })) || '';
  } catch (error) {
    throw toClerkAuthError(error, 'Unable to refresh your session.');
  }
};

export const logoutCurrentUser = async () => {
  const runtime = ensureAuthRuntime();

  try {
    await runtime.signOut();
  } catch (error) {
    throw toClerkAuthError(error, 'Unable to log out right now.');
  }
};

export const getCurrentUserEmail = () =>
  normalizeEmail(authRuntime?.currentUserEmail || '');
