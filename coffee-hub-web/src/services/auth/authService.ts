import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { formatPhoneForDisplay, normalizePhoneNumber, safeNormalizePhoneNumber } from '../../../shared/phone';
import type { UserRole } from '../../features/app/types';
import { syncUserProfileRequest } from '../api/userService';
import { auth, db } from '../firebase';
import {
  clearPendingPhoneVerification,
  requestPhoneVerification,
  resolvePhoneVerification,
  type PendingPhoneVerification,
  type RecaptchaMode,
} from '../firebase/phoneAuthService';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';

export const PHONE_AUTH_RECAPTCHA_CONTAINER_ID = 'firebase-phone-auth-recaptcha';

export type AuthUser = {
  displayName: string;
  email: string;
  phone: string;
  photoURL: string | null;
  provider: 'phone';
  role: UserRole;
  uid: string;
};

type AuthUserOverrides = {
  phone?: string;
  role?: UserRole;
};

const normalize = (value: string) => value.replace(/\s+/g, '');

const normalizePhoneForComparison = (value: string) =>
  safeNormalizePhoneNumber(normalize(value)) || normalize(value).trim();

const normalizeRole = (value: unknown): UserRole => {
  if (value === 'admin' || value === 'agent') {
    return value;
  }

  return 'customer';
};

const getConfiguredAdminPhone = () =>
  normalizePhoneForComparison(import.meta.env.VITE_ADMIN_PHONE || '');

const getConfiguredAgentPhone = () =>
  normalizePhoneForComparison(import.meta.env.VITE_AGENT_PHONE || '');

const buildDisplayName = (phone: string) =>
  formatPhoneForDisplay(phone) || 'COFFEE-HUB User';

const resolveRoleFromPhone = (phone: string): UserRole => {
  const normalizedPhone = normalizePhoneForComparison(phone);
  const adminPhone = getConfiguredAdminPhone();
  const agentPhone = getConfiguredAgentPhone();
  const isAdmin = Boolean(normalizedPhone && adminPhone) && normalizedPhone === adminPhone;
  const isAgent = Boolean(normalizedPhone && agentPhone) && normalizedPhone === agentPhone;
  let role: UserRole;

  if (isAdmin) {
    role = 'admin';
  } else if (isAgent) {
    role = 'agent';
  } else {
    role = 'customer';
  }

  console.log('PHONE:', normalizedPhone);
  console.log('ADMIN_PHONE:', adminPhone);
  console.log('AGENT_PHONE:', agentPhone);
  console.log('ROLE:', role);

  return role;
};

const mapFirebaseUser = (
  firebaseUser: FirebaseUser,
  {
    phone,
    role = 'customer',
  }: AuthUserOverrides = {},
): AuthUser => {
  const normalizedPhone = safeNormalizePhoneNumber(phone || firebaseUser.phoneNumber || '');

  return {
    displayName: firebaseUser.displayName?.trim() || buildDisplayName(normalizedPhone),
    email: firebaseUser.email?.trim().toLowerCase() || '',
    phone: normalizedPhone,
    photoURL: firebaseUser.photoURL,
    provider: 'phone',
    role,
    uid: firebaseUser.uid,
  };
};

const pendingUserResolutions = new Map<string, Promise<AuthUser>>();

const resolveAuthenticatedUser = (
  firebaseUser: FirebaseUser,
  fallbackPhone = '',
): Promise<AuthUser> => {
  const existingResolution = pendingUserResolutions.get(firebaseUser.uid);
  if (existingResolution) {
    return existingResolution;
  }

  const resolution = (async () => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnapshot = await getDoc(userRef);
    const storedData = userSnapshot.exists()
      ? userSnapshot.data() as Record<string, unknown>
      : null;
    const authPhone = safeNormalizePhoneNumber(fallbackPhone || firebaseUser.phoneNumber || '');
    const storedPhone = safeNormalizePhoneNumber(
      typeof storedData?.phone === 'string' ? storedData.phone : authPhone,
    );
    const fallbackResolvedPhone = storedPhone || authPhone;
    const fallbackResolvedRole = resolveRoleFromPhone(fallbackResolvedPhone);
    let resolvedPhone = fallbackResolvedPhone;
    let resolvedRole = fallbackResolvedRole;

    try {
      const idToken = await firebaseUser.getIdToken(true);
      const response = await syncUserProfileRequest(
        {
          name:
            firebaseUser.displayName?.trim() ||
            (typeof storedData?.name === 'string' ? storedData.name : '') ||
            buildDisplayName(authPhone),
        },
        idToken,
      );

      resolvedPhone = safeNormalizePhoneNumber(response.profile.phone || fallbackResolvedPhone) ||
        fallbackResolvedPhone;
      resolvedRole = response.profile.role
        ? normalizeRole(response.profile.role)
        : fallbackResolvedRole;
    } catch (error) {
      console.error('Failed to sync authenticated user profile before rendering', error);
    }

    return mapFirebaseUser(firebaseUser, {
      phone: resolvedPhone,
      role: resolvedRole,
    });
  })();

  pendingUserResolutions.set(firebaseUser.uid, resolution);

  return resolution.finally(() => {
    pendingUserResolutions.delete(firebaseUser.uid);
  });
};

export const observeAuthSession = (onChange: (user: AuthUser | null) => void) => {
  let unsubscribeRole = () => undefined;
  let sequence = 0;

  const unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
    const currentSequence = ++sequence;
    unsubscribeRole();

    if (!firebaseUser) {
      onChange(null);
      return;
    }

    void (async () => {
      try {
        const nextUser = await resolveAuthenticatedUser(firebaseUser);
        if (currentSequence !== sequence) {
          return;
        }

        onChange(nextUser);
      } catch (error) {
        console.error('Failed to resolve the authenticated user role', error);
        if (currentSequence !== sequence) {
          return;
        }

        const fallbackPhone = safeNormalizePhoneNumber(firebaseUser.phoneNumber || '');
        onChange(mapFirebaseUser(firebaseUser, {
          phone: fallbackPhone,
          role: resolveRoleFromPhone(fallbackPhone),
        }));
      }

      if (currentSequence !== sequence) {
        return;
      }

      unsubscribeRole = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        snapshot => {
          if (currentSequence !== sequence) {
            return;
          }

          const data = snapshot.data() as Record<string, unknown> | undefined;
          const phone = safeNormalizePhoneNumber(
            typeof data?.phone === 'string' ? data.phone : firebaseUser.phoneNumber || '',
          );
          const role = resolveRoleFromPhone(phone);

          onChange(mapFirebaseUser(firebaseUser, {
            phone,
            role,
          }));
        },
        error => {
          console.error('Failed to subscribe to the authenticated user role', error);
          if (currentSequence !== sequence) {
            return;
          }

          const fallbackPhone = safeNormalizePhoneNumber(firebaseUser.phoneNumber || '');
          onChange(mapFirebaseUser(firebaseUser, {
            phone: fallbackPhone,
            role: resolveRoleFromPhone(fallbackPhone),
          }));
        },
      );
    })();
  });

  return () => {
    ++sequence;
    unsubscribeRole();
    unsubscribeAuth();
  };
};

export const requestOtp = async (
  phoneNumber: string,
  recaptchaMode: RecaptchaMode = 'invisible',
): Promise<PendingPhoneVerification> => {
  let normalizedPhone = '';

  try {
    normalizedPhone = normalizePhoneNumber(phoneNumber);
  } catch (error) {
    throw toAppServiceError(error, 'Enter a valid mobile number.', 'validation');
  }

  try {
    return await requestPhoneVerification(normalizedPhone, {
      containerId: PHONE_AUTH_RECAPTCHA_CONTAINER_ID,
      recaptchaMode,
    });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to send the OTP right now.', 'network');
  }
};

export const verifyOtp = async (otpCode: string): Promise<AuthUser> => {
  const firebaseUser = await resolvePhoneVerification(otpCode);

  try {
    return await resolveAuthenticatedUser(firebaseUser);
  } catch (error) {
    throw toAppServiceError(error, 'Unable to finish signing in right now.', 'network');
  }
};

export const cancelOtp = () => {
  clearPendingPhoneVerification();
};

export const getCurrentUserIdToken = async (forceRefresh = false) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new AppServiceError('Please sign in to continue.', {
      code: 'validation',
    });
  }

  return currentUser.getIdToken(forceRefresh);
};

export const logoutCurrentUser = async () => {
  clearPendingPhoneVerification();
  await signOut(auth);
};
