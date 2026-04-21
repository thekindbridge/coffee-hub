import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { formatPhoneForDisplay, normalizePhoneNumber, safeNormalizePhoneNumber } from '../../../shared/phone';
import type { UserRole } from '../../features/app/types';
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

const normalizeRole = (value: unknown): UserRole => {
  if (value === 'admin' || value === 'agent') {
    return value;
  }

  return 'customer';
};

const buildDisplayName = (phone: string) =>
  formatPhoneForDisplay(phone) || 'COFFEE-HUB User';

const mapFirebaseUser = (
  firebaseUser: FirebaseUser,
  role: UserRole = 'customer',
): AuthUser => {
  const phone = safeNormalizePhoneNumber(firebaseUser.phoneNumber || '');

  return {
    displayName: firebaseUser.displayName?.trim() || buildDisplayName(phone),
    email: firebaseUser.email?.trim().toLowerCase() || '',
    phone,
    photoURL: firebaseUser.photoURL,
    provider: 'phone',
    role,
    uid: firebaseUser.uid,
  };
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

    unsubscribeRole = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      snapshot => {
        if (currentSequence !== sequence) {
          return;
        }

        onChange(mapFirebaseUser(firebaseUser, normalizeRole(snapshot.data()?.role)));
      },
      error => {
        console.error('Failed to subscribe to the authenticated user role', error);
        if (currentSequence !== sequence) {
          return;
        }

        onChange(mapFirebaseUser(firebaseUser));
      },
    );
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
  try {
    const firebaseUser = await resolvePhoneVerification(otpCode);
    return mapFirebaseUser(firebaseUser);
  } catch (error) {
    throw toAppServiceError(error, 'Unable to verify the OTP right now.', 'validation');
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
