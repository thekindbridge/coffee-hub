import { App as CapacitorApp, type PluginListenerHandle } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { Clerk, ClientResource, SignInResource } from '@clerk/shared/types';
import { isBrowserEnvironment, isNativeAndroidAuthPlatform } from '../platform/authPlatform';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
};

const CLERK_CALLBACK_QUERY_PARAM = 'clerk_callback';
const GOOGLE_OAUTH_STRATEGY = 'oauth_google';
const NATIVE_REDIRECT_SCHEME = 'com.coffeehub.app';
const NATIVE_REDIRECT_HOST = 'auth';
const NATIVE_REDIRECT_PATH = '/callback';
const NATIVE_REDIRECT_URL =
  `${NATIVE_REDIRECT_SCHEME}://${NATIVE_REDIRECT_HOST}${NATIVE_REDIRECT_PATH}`;

type NativeAuthPendingState = {
  completed: boolean;
  reject: (reason: AppServiceError) => void;
  resolve: () => void;
};

let authRuntime: Clerk | null = null;
let hasInitializedNativeBridge = false;
let nativeAppUrlOpenListener: PluginListenerHandle | null = null;
let nativeBrowserFinishedListener: PluginListenerHandle | null = null;
let pendingNativeAuth: NativeAuthPendingState | null = null;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getPrimaryEmail = (clerk: Clerk | null) => {
  const primaryEmailAddressId = clerk?.user?.primaryEmailAddressId || '';
  const primaryEmail =
    clerk?.user?.emailAddresses?.find(emailAddress => emailAddress.id === primaryEmailAddressId)
      ?.emailAddress ||
    clerk?.user?.primaryEmailAddress?.emailAddress ||
    clerk?.user?.emailAddresses?.[0]?.emailAddress ||
    '';

  return primaryEmail;
};

const toClerkAuthError = (
  error: unknown,
  fallbackMessage: string,
  code: 'network' | 'permission' | 'unsupported' | 'validation' = 'network',
) => {
  if (
    error &&
    typeof error === 'object' &&
    Array.isArray((error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors)
  ) {
    const firstError = (error as { errors: Array<{ longMessage?: string; message?: string }> }).errors[0];
    const message = firstError?.longMessage || firstError?.message;

    if (message) {
      return new AppServiceError(message, {
        cause: error,
        code,
      });
    }
  }

  return toAppServiceError(error, fallbackMessage, code);
};

const ensureLoadedClerk = () => {
  if (!authRuntime?.loaded || !authRuntime.client) {
    throw new AppServiceError('Authentication is still loading. Please try again.', {
      code: 'validation',
    });
  }

  return authRuntime as Clerk & { client: ClientResource };
};

const cleanupBrowserFinishedListener = async () => {
  if (!nativeBrowserFinishedListener) {
    return;
  }

  const listener = nativeBrowserFinishedListener;
  nativeBrowserFinishedListener = null;
  await listener.remove().catch(() => undefined);
};

const resetPendingNativeAuth = async () => {
  pendingNativeAuth = null;
  await cleanupBrowserFinishedListener();
};

const resolvePendingNativeAuth = async () => {
  if (!pendingNativeAuth || pendingNativeAuth.completed) {
    return;
  }

  pendingNativeAuth.completed = true;
  pendingNativeAuth.resolve();
  await resetPendingNativeAuth();
};

const rejectPendingNativeAuth = async (error: AppServiceError) => {
  if (!pendingNativeAuth || pendingNativeAuth.completed) {
    return;
  }

  pendingNativeAuth.completed = true;
  pendingNativeAuth.reject(error);
  await resetPendingNativeAuth();
};

const buildCurrentAppUrl = () => {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete(CLERK_CALLBACK_QUERY_PARAM);
  return currentUrl.toString();
};

const buildWebCallbackUrl = () => {
  const callbackUrl = new URL(window.location.origin);
  callbackUrl.searchParams.set(CLERK_CALLBACK_QUERY_PARAM, '1');
  return callbackUrl.toString();
};

const buildAppCallbackUrlFromNativeUrl = (nativeUrl: string) => {
  const incomingUrl = new URL(nativeUrl);
  const callbackUrl = new URL(window.location.origin);

  callbackUrl.searchParams.set(CLERK_CALLBACK_QUERY_PARAM, '1');

  incomingUrl.searchParams.forEach((value, key) => {
    callbackUrl.searchParams.set(key, value);
  });

  callbackUrl.hash = incomingUrl.hash;

  return callbackUrl.toString();
};

const isNativeAuthCallbackUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === `${NATIVE_REDIRECT_SCHEME}:` &&
      parsedUrl.host === NATIVE_REDIRECT_HOST &&
      parsedUrl.pathname === NATIVE_REDIRECT_PATH
    );
  } catch {
    return false;
  }
};

const getExternalVerificationRedirectUrl = (signIn: SignInResource) => {
  const redirectUrl = signIn.firstFactorVerification.externalVerificationRedirectURL?.toString() || '';

  if (!redirectUrl) {
    throw new AppServiceError('Google sign-in could not be started right now.', {
      code: 'unsupported',
    });
  }

  return redirectUrl;
};

const createGoogleOAuthSignIn = async (clerk: Clerk & { client: ClientResource }) => {
  try {
    return await clerk.client.signIn.create({
      strategy: GOOGLE_OAUTH_STRATEGY,
      redirectUrl: isNativeAndroidAuthPlatform() ? NATIVE_REDIRECT_URL : buildWebCallbackUrl(),
      actionCompleteRedirectUrl: buildCurrentAppUrl(),
    });
  } catch (error) {
    throw toClerkAuthError(error, 'Unable to start Google sign-in right now.');
  }
};

const beginNativeRedirectFlow = async (redirectUrl: string) => {
  await cleanupBrowserFinishedListener();

  nativeBrowserFinishedListener = await Browser.addListener('browserFinished', () => {
    void rejectPendingNativeAuth(
      new AppServiceError('Google sign-in was cancelled.', {
        code: 'validation',
      }),
    );
  });

  await Browser.open({
    url: redirectUrl,
    toolbarColor: '#120c09',
  });

  return new Promise<void>((resolve, reject) => {
    pendingNativeAuth = {
      completed: false,
      resolve,
      reject,
    };
  });
};

const handleNativeAuthCallback = async (url: string) => {
  if (!isBrowserEnvironment() || !isNativeAuthCallbackUrl(url)) {
    return false;
  }

  const callbackUrl = buildAppCallbackUrlFromNativeUrl(url);

  await resolvePendingNativeAuth();

  if (window.location.href !== callbackUrl) {
    window.location.replace(callbackUrl);
  }

  return true;
};

export const syncAuthRuntime = (clerk: Clerk | null) => {
  authRuntime = clerk;
};

export const initializeAuthState = async () => {
  if (!isBrowserEnvironment() || !isNativeAndroidAuthPlatform() || hasInitializedNativeBridge) {
    return;
  }

  hasInitializedNativeBridge = true;

  nativeAppUrlOpenListener = await CapacitorApp.addListener('appUrlOpen', event => {
    void handleNativeAuthCallback(event.url);
  });

  const launchUrl = await CapacitorApp.getLaunchUrl();
  if (launchUrl?.url) {
    await handleNativeAuthCallback(launchUrl.url);
  }
};

export const isAuthCallbackRoute = () => {
  if (!isBrowserEnvironment()) {
    return false;
  }

  return new URLSearchParams(window.location.search).get(CLERK_CALLBACK_QUERY_PARAM) === '1';
};

export const getAuthSessionSnapshot = (): AuthSessionSnapshot => {
  const currentUserId = authRuntime?.user?.id || '';
  const currentUserEmail = getPrimaryEmail(authRuntime);

  return {
    currentUserEmail,
    currentUserId,
    isLoggedIn: Boolean(authRuntime?.isSignedIn && currentUserId),
  };
};

export const getCurrentUserIdToken = async (forceRefresh = false) => {
  const clerk = ensureLoadedClerk();

  try {
    return (await clerk.session?.getToken({ skipCache: forceRefresh })) || '';
  } catch (error) {
    throw toClerkAuthError(error, 'Unable to refresh your session.');
  }
};

export const logoutCurrentUser = async () => {
  const clerk = ensureLoadedClerk();

  try {
    await clerk.signOut();
    await resetPendingNativeAuth();
  } catch (error) {
    throw toClerkAuthError(error, 'Unable to log out right now.');
  }
};

export const loginWithGoogle = async () => {
  if (!isBrowserEnvironment()) {
    throw new AppServiceError('Google sign-in is only available in the app browser context.', {
      code: 'unsupported',
    });
  }

  const clerk = ensureLoadedClerk();
  const signIn = await createGoogleOAuthSignIn(clerk);
  const redirectUrl = getExternalVerificationRedirectUrl(signIn);

  if (isNativeAndroidAuthPlatform()) {
    try {
      await beginNativeRedirectFlow(redirectUrl);
      return;
    } catch (error) {
      throw toClerkAuthError(error, 'Unable to open secure Google sign-in.', 'network');
    }
  }

  window.location.assign(redirectUrl);
};

export const getCurrentUserEmail = () => normalizeEmail(getPrimaryEmail(authRuntime));

