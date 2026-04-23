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

const normalizeRole = (value: unknown): UserRole => {
  if (value === 'admin' || value === 'agent') {
    return value;
  }

  return 'customer';
};

const buildDisplayName = (phone: string) =>
  formatPhoneForDisplay(phone) || 'COFFEE-HUB User';

const logResolvedRole = (phone: string, role: UserRole) => {
  console.log('Phone:', phone);
  console.log('Assigned Role:', role);
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

    if (userSnapshot.exists()) {
      const role = normalizeRole(storedData?.role);
      logResolvedRole(storedPhone || authPhone, role);
      return mapFirebaseUser(firebaseUser, {
        phone: storedPhone || authPhone,
        role,
      });
    }

    const idToken = await firebaseUser.getIdToken(true);
    const response = await syncUserProfileRequest(
      {
        name: firebaseUser.displayName?.trim() || buildDisplayName(authPhone),
      },
      idToken,
    );
    const syncedPhone = safeNormalizePhoneNumber(response.profile.phone || authPhone);
    const role = normalizeRole(response.profile.role);

    logResolvedRole(syncedPhone || authPhone, role);

    return mapFirebaseUser(firebaseUser, {
      phone: syncedPhone || authPhone,
      role,
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

        onChange(mapFirebaseUser(firebaseUser));
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
          const role = normalizeRole(data?.role);

          logResolvedRole(phone, role);

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

          onChange(mapFirebaseUser(firebaseUser));
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
