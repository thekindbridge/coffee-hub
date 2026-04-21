import {
  DEMO_AUTH_PIN,
  buildDemoAuthToken,
  normalizeDemoAdminPhones,
  parseDemoAuthToken,
  resolveDemoRole,
  type DemoAuthRole,
} from '../../../shared/demoAuth';
import { formatPhoneForDisplay, normalizePhoneNumber } from '../../../shared/phone';
import { storageAdapter } from '../platform/storageAdapter';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';

const DEMO_AUTH_STORAGE_KEY = 'coffee-hub:web:demo-auth-session';

const DEMO_ADMIN_NUMBERS = normalizeDemoAdminPhones([
  import.meta.env.VITE_ADMIN_PHONE || '',
  '+917893504891',
]);

export type AuthUser = {
  displayName: string;
  phone: string;
  provider: 'demo-pin';
  role: DemoAuthRole;
  sessionId: string;
  uid: string;
};

export type AuthSessionSnapshot = {
  currentUserId: string;
  currentUserPhone: string;
  isLoggedIn: boolean;
  role: DemoAuthRole;
  user: AuthUser | null;
};

type StoredDemoAuthSession = {
  token: string;
  user: AuthUser;
};

const toFirebaseAuthError = (
  error: unknown,
  fallbackMessage: string,
  code: 'network' | 'permission' | 'unsupported' | 'validation' = 'network',
) => toAppServiceError(error, fallbackMessage, code);

const buildDisplayName = (phone: string) => formatPhoneForDisplay(phone) || 'COFFEE-HUB User';

const readStoredSession = (): StoredDemoAuthSession | null => {
  const rawValue = storageAdapter.read(DEMO_AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<StoredDemoAuthSession>;
    const parsedToken = typeof parsedValue.token === 'string'
      ? parsedValue.token.trim()
      : '';
    const parsedUser = parsedValue.user;
    const tokenPayload = parseDemoAuthToken(parsedToken);

    if (
      !tokenPayload ||
      !parsedUser ||
      typeof parsedUser !== 'object' ||
      typeof parsedUser.phone !== 'string' ||
      typeof parsedUser.uid !== 'string' ||
      typeof parsedUser.sessionId !== 'string'
    ) {
      storageAdapter.remove(DEMO_AUTH_STORAGE_KEY);
      return null;
    }

    return {
      token: parsedToken,
      user: {
        displayName: typeof parsedUser.displayName === 'string'
          ? parsedUser.displayName
          : buildDisplayName(tokenPayload.phone),
        phone: tokenPayload.phone,
        provider: 'demo-pin',
        role: tokenPayload.role,
        sessionId: tokenPayload.sessionId,
        uid: tokenPayload.uid,
      },
    };
  } catch {
    storageAdapter.remove(DEMO_AUTH_STORAGE_KEY);
    return null;
  }
};

const writeStoredSession = (session: StoredDemoAuthSession) => {
  storageAdapter.write(DEMO_AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const restoreAuthSession = () => readStoredSession()?.user || null;

export const getAuthSessionSnapshot = (): AuthSessionSnapshot => {
  const session = readStoredSession();

  return {
    currentUserId: session?.user.uid || '',
    currentUserPhone: session?.user.phone || '',
    isLoggedIn: Boolean(session?.user.uid),
    role: session?.user.role || 'customer',
    user: session?.user || null,
  };
};

export const loginWithPin = async (
  phoneNumber: string,
  pin: string,
) => {
  const normalizedPin = pin.trim();
  if (!normalizedPin) {
    throw new AppServiceError('Enter your PIN to continue.', {
      code: 'validation',
    });
  }

  if (normalizedPin !== DEMO_AUTH_PIN) {
    throw new AppServiceError('Invalid PIN', {
      code: 'validation',
    });
  }

  let normalizedPhone = '';

  try {
    normalizedPhone = normalizePhoneNumber(phoneNumber);
  } catch (error) {
    throw toFirebaseAuthError(error, 'Enter a valid mobile number.', 'validation');
  }

  const role = resolveDemoRole(normalizedPhone, DEMO_ADMIN_NUMBERS);
  const sessionId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const user: AuthUser = {
    displayName: buildDisplayName(normalizedPhone),
    phone: normalizedPhone,
    provider: 'demo-pin',
    role,
    sessionId,
    uid: normalizedPhone,
  };
  const token = buildDemoAuthToken({
    displayName: user.displayName,
    phone: user.phone,
    role: user.role,
    sessionId: user.sessionId,
    uid: user.uid,
  });

  writeStoredSession({ token, user });
  return user;
};

export const getCurrentUserIdToken = async (_forceRefresh = false) => {
  const session = readStoredSession();
  if (!session?.token) {
    throw new AppServiceError('Authentication is still loading. Please try again.', {
      code: 'validation',
    });
  }

  return session.token;
};

export const logoutCurrentUser = async () => {
  storageAdapter.remove(DEMO_AUTH_STORAGE_KEY);
};

export const getCurrentUserPhone = () =>
  readStoredSession()?.user.phone || '';
