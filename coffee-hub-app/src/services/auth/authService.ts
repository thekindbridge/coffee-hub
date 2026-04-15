import { normalizeEmail } from '../../features/roles/lib/normalizeEmail';
import { getUserRole, type UserRole } from '../roleService';
import { AppServiceError, toAppServiceError } from '../serviceError';

export type AuthUser = {
  displayName: string | null;
  email: string;
  isAnonymous: false;
  photoURL: string | null;
  provider: 'dummy';
  role: UserRole;
  uid: string;
};

type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
  user: AuthUser | null;
};

const buildDisplayNameFromEmail = (email: string) => {
  const localPart = normalizeEmail(email).split('@')[0] || 'coffeehub';

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'COFFEE-HUB';
};

const buildAuthUser = (email: string, role: UserRole): AuthUser => {
  const normalizedUserEmail = normalizeEmail(email);

  return {
    displayName: buildDisplayNameFromEmail(normalizedUserEmail),
    email: normalizedUserEmail,
    isAnonymous: false,
    photoURL: null,
    provider: 'dummy',
    role,
    uid: normalizedUserEmail,
  };
};

export const getAuthSessionSnapshot = (user: AuthUser | null): AuthSessionSnapshot => ({
  currentUserEmail: user?.email || '',
  currentUserId: user?.uid || '',
  isLoggedIn: Boolean(user),
  user,
});

export const loginWithEmail = async (email: string) => {
  const normalizedUserEmail = normalizeEmail(email);
  if (!normalizedUserEmail) {
    throw new AppServiceError('Enter a valid email address to continue.', {
      code: 'validation',
    });
  }

  try {
    const role = await getUserRole(normalizedUserEmail);
    const user = buildAuthUser(normalizedUserEmail, role);
    return user;
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to continue right now.',
      error instanceof AppServiceError ? error.code : 'network',
    );
  }
};

export const logoutCurrentUser = async () => undefined;
