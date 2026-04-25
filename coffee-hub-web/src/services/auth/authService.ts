import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { formatPhoneForDisplay, normalizePhoneNumber, safeNormalizePhoneNumber } from '../../../shared/phone';
import type { UserRole } from '../../features/app/types';
import { syncUserProfileRequest } from '../api/userService';
import { auth, db } from '../firebase';
import {
  getUserRole,
  subscribeToUserRole,
} from '../roleService';
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

const buildDisplayName = (phone: string) =>
  formatPhoneForDisplay(phone) || 'COFFEE-HUB User';

const syncAuthenticatedUserIdentity = async ({
  uid,
  phone,
}: {
  uid: string;
  phone: string;
}) => {
  if (!uid || !phone) {
    return;
  }

  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      phone,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
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
    const authPhone = safeNormalizePhoneNumber(fallbackPhone || firebaseUser.phoneNumber || '');
    const resolvedRole = await getUserRole(authPhone);
    let resolvedPhone = authPhone;
    let resolvedRoleValue = resolvedRole;

    await syncAuthenticatedUserIdentity({
      uid: firebaseUser.uid,
      phone: authPhone,
    });

    try {
      const idToken = await firebaseUser.getIdToken(true);
      const response = await syncUserProfileRequest(
        {
          name:
            firebaseUser.displayName?.trim() ||
            buildDisplayName(authPhone),
          phone: authPhone || safeNormalizePhoneNumber(firebaseUser.phoneNumber || ''),
        },
        idToken,
      );

      resolvedPhone = safeNormalizePhoneNumber(response.profile.phone || resolvedPhone) || resolvedPhone;
      resolvedRoleValue = response.profile.role || resolvedRoleValue;
    } catch (error) {
      console.error('Failed to sync authenticated user profile before rendering', error);
    }

    return mapFirebaseUser(firebaseUser, {
      phone: resolvedPhone,
      role: resolvedRoleValue,
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
      let resolvedUser: AuthUser | null = null;

      try {
        resolvedUser = await resolveAuthenticatedUser(firebaseUser);
        if (currentSequence !== sequence) {
          return;
        }

        onChange(resolvedUser);
      } catch (error) {
        console.error('Failed to resolve the authenticated user role', error);
        if (currentSequence !== sequence) {
          return;
        }

        const fallbackPhone = safeNormalizePhoneNumber(firebaseUser.phoneNumber || '');
        resolvedUser = mapFirebaseUser(firebaseUser, {
          phone: fallbackPhone,
          role: 'customer',
        });
        onChange(resolvedUser);
      }

      if (currentSequence !== sequence || !resolvedUser) {
        return;
      }

      const normalizedPhone = safeNormalizePhoneNumber(
        resolvedUser.phone || firebaseUser.phoneNumber || '',
      );

      unsubscribeRole = subscribeToUserRole(
        normalizedPhone,
        role => {
          if (currentSequence !== sequence) {
            return;
          }

          onChange(mapFirebaseUser(firebaseUser, {
            phone: normalizedPhone,
            role,
          }));
        },
        error => {
          console.error('Failed to subscribe to the authenticated user role', error);
          if (currentSequence !== sequence) {
            return;
          }

          onChange(resolvedUser);
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
