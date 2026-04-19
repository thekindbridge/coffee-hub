import { AppServiceError, toAppServiceError } from '../platform/serviceError';

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
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

const normalizeEmail = (value: string) => value.trim().toLowerCase();

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
