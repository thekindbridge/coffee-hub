import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { formatPhoneForDisplay, normalizePhoneNumber, safeNormalizePhoneNumber } from '../../../shared/phone';
import { resolveRoleFromConfiguredPhones } from '../../../shared/userRole';
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

const normalizeRole = (value: unknown): UserRole => {
  if (value === 'admin' || value === 'agent') {
    return value;
  }

  return 'customer';
};

const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE || '';
const AGENT_PHONE = import.meta.env.VITE_AGENT_PHONE || '';

const buildDisplayName = (phone: string) =>
  formatPhoneForDisplay(phone) || 'COFFEE-HUB User';

const resolveRoleFromPhone = (phone: string): UserRole => {
  return resolveRoleFromConfiguredPhones({
    phone,
    adminPhone: ADMIN_PHONE,
    agentPhone: AGENT_PHONE,
  });
};

const logResolvedRole = (phone: string, role: UserRole) => {
  console.log('PHONE:', phone);
  console.log('ENV ADMIN:', ADMIN_PHONE);
  console.log('ENV AGENT:', AGENT_PHONE);
  console.log('FINAL ROLE:', role);
};

const syncAuthenticatedUserRole = async ({
  uid,
  phone,
  role,
}: {
  uid: string;
  phone: string;
  role: UserRole;
}) => {
  if (!uid) {
    return;
  }

  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      phone,
      role,
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
    const resolvedRole = resolveRoleFromPhone(authPhone);
    let resolvedPhone = authPhone;

    logResolvedRole(authPhone, resolvedRole);
    await syncAuthenticatedUserRole({
      uid: firebaseUser.uid,
      phone: authPhone,
      role: resolvedRole,
    });

    try {
      const idToken = await firebaseUser.getIdToken(true);
      const response = await syncUserProfileRequest(
        {
          name:
            firebaseUser.displayName?.trim() ||
            buildDisplayName(authPhone),
        },
        idToken,
      );

      resolvedPhone = safeNormalizePhoneNumber(response.profile.phone || resolvedPhone) || resolvedPhone;

      await syncAuthenticatedUserRole({
        uid: firebaseUser.uid,
        phone: resolvedPhone,
        role: resolvedRole,
      });
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
          const storedPhone = safeNormalizePhoneNumber(
            typeof data?.phone === 'string' ? data.phone : '',
          );
          const phone = safeNormalizePhoneNumber(
            typeof data?.phone === 'string' ? data.phone : firebaseUser.phoneNumber || '',
          );
          const storedRole = normalizeRole(data?.role);
          const role = resolveRoleFromPhone(phone);

          if (phone && (storedPhone !== phone || storedRole !== role)) {
            void syncAuthenticatedUserRole({
              uid: firebaseUser.uid,
              phone,
              role,
            }).catch(error => {
              console.error('Failed to correct the authenticated user role', error);
            });
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
