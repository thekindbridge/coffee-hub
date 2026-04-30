import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { formatPhoneForDisplay, normalizePhoneNumber, safeNormalizePhoneNumber } from '../../../shared/phone';
import { resolveUserRole } from '../../../shared/userRole';
import type { UserRole } from '../../features/app/types';
import { reserveOtpRequest, OtpControlError } from '../api/otpControlService';
import { syncUserProfileRequest } from '../api/userService';
import { auth, db } from '../firebase';
import {
  getMainAdminPhone,
  getUserRole,
  subscribeToUserRole,
} from '../roleService';
import {
  clearPendingPhoneVerification,
  requestPhoneVerification,
  resolvePhoneVerification,
  shouldUseVisibleRecaptcha,
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

const buildFallbackRole = (phone: string) =>
  resolveUserRole({
    phone,
    mainAdminPhone: getMainAdminPhone(),
  });

type OtpControlGrant = {
  allowVisibleRetry: boolean;
  expiresAt: number;
  phone: string;
};

const OTP_CONTROL_GRANT_TTL_MS = 2 * 60 * 1000;

let otpControlGrant: OtpControlGrant | null = null;

const clearOtpControlGrant = () => {
  otpControlGrant = null;
};

const canReuseOtpControlGrant = (
  phone: string,
  recaptchaMode: RecaptchaMode,
) =>
  Boolean(
    recaptchaMode === 'visible' &&
    otpControlGrant &&
    otpControlGrant.phone === phone &&
    otpControlGrant.allowVisibleRetry &&
    otpControlGrant.expiresAt > Date.now(),
  );

const reserveOtpControlGrant = async (
  phone: string,
  recaptchaMode: RecaptchaMode,
) => {
  if (canReuseOtpControlGrant(phone, recaptchaMode)) {
    otpControlGrant = otpControlGrant
      ? {
        ...otpControlGrant,
        allowVisibleRetry: false,
      }
      : null;
    return;
  }

  await reserveOtpRequest(phone);
  otpControlGrant = {
    allowVisibleRetry: true,
    expiresAt: Date.now() + OTP_CONTROL_GRANT_TTL_MS,
    phone,
  };
};

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

const buildImmediateAuthUser = (
  firebaseUser: FirebaseUser,
  fallbackPhone = '',
) => {
  const normalizedPhone = safeNormalizePhoneNumber(
    fallbackPhone || firebaseUser.phoneNumber || '',
  );

  return mapFirebaseUser(firebaseUser, {
    phone: normalizedPhone,
    role: buildFallbackRole(normalizedPhone),
  });
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
    const resolvedRolePromise = getUserRole(authPhone);
    let resolvedPhone = authPhone;
    let resolvedRoleValue = await resolvedRolePromise;

    void syncAuthenticatedUserIdentity({
      uid: firebaseUser.uid,
      phone: authPhone,
    }).catch(error => {
      console.error('Failed to sync authenticated user identity', error);
    });

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await syncUserProfileRequest(
        {
          name: firebaseUser.displayName?.trim() || '',
          phone: authPhone || safeNormalizePhoneNumber(firebaseUser.phoneNumber || ''),
        },
        idToken,
      );

      resolvedPhone = safeNormalizePhoneNumber(response.profile.phone || resolvedPhone) || resolvedPhone;
      resolvedRoleValue = response.profile.role || await resolvedRolePromise;
    } catch (error) {
      console.error('Failed to sync authenticated user profile in the background', error);
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

  const subscribeToResolvedRole = ({
    currentSequence,
    fallbackUser,
    firebaseUser,
    phone,
  }: {
    currentSequence: number;
    fallbackUser: AuthUser;
    firebaseUser: FirebaseUser;
    phone: string;
  }) => {
    if (!phone) {
      unsubscribeRole = () => undefined;
      return;
    }

    unsubscribeRole = subscribeToUserRole(
      phone,
      role => {
        if (currentSequence !== sequence) {
          return;
        }

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

        onChange(fallbackUser);
      },
    );
  };

  const unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
    const currentSequence = ++sequence;
    unsubscribeRole();

    if (!firebaseUser) {
      onChange(null);
      return;
    }

    const immediateUser = buildImmediateAuthUser(firebaseUser);
    onChange(immediateUser);
    subscribeToResolvedRole({
      currentSequence,
      fallbackUser: immediateUser,
      firebaseUser,
      phone: immediateUser.phone,
    });

    void (async () => {
      try {
        const resolvedUser = await resolveAuthenticatedUser(
          firebaseUser,
          immediateUser.phone,
        );
        if (currentSequence !== sequence) {
          return;
        }

        onChange(resolvedUser);
        if (resolvedUser.phone && resolvedUser.phone !== immediateUser.phone) {
          unsubscribeRole();
          subscribeToResolvedRole({
            currentSequence,
            fallbackUser: resolvedUser,
            firebaseUser,
            phone: resolvedUser.phone,
          });
        }
      } catch (error) {
        console.error('Failed to hydrate the authenticated user session', error);
        if (currentSequence !== sequence) {
          return;
        }

        const fallbackUser = buildImmediateAuthUser(firebaseUser);
        onChange(fallbackUser);
        subscribeToResolvedRole({
          currentSequence,
          fallbackUser,
          firebaseUser,
          phone: fallbackUser.phone,
        });
      }
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
    await reserveOtpControlGrant(normalizedPhone, recaptchaMode);
    return await requestPhoneVerification(normalizedPhone, {
      containerId: PHONE_AUTH_RECAPTCHA_CONTAINER_ID,
      recaptchaMode,
    });
  } catch (error) {
    if (
      recaptchaMode === 'invisible' &&
      shouldUseVisibleRecaptcha(error)
    ) {
      throw toAppServiceError(error, 'Unable to send the OTP right now.', 'network');
    }

    clearOtpControlGrant();

    throw toAppServiceError(
      error,
      error instanceof OtpControlError
        ? error.message
        : 'Unable to send the OTP right now.',
      error instanceof OtpControlError ? 'validation' : 'network',
    );
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
  clearOtpControlGrant();
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
  clearOtpControlGrant();
  await signOut(auth);
};
