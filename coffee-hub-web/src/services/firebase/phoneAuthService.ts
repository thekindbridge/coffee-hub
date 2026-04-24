import {
  type ConfirmationResult,
  type User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { normalizePhoneNumber } from '../../../shared/phone';
import { auth } from './index';

export type RecaptchaMode = 'invisible' | 'visible';

export type PendingPhoneVerification = {
  phone: string;
  recaptchaMode: RecaptchaMode;
};

let recaptchaVerifier: RecaptchaVerifier | null = null;
let pendingConfirmationResult: ConfirmationResult | null = null;
let pendingVerification: PendingPhoneVerification | null = null;

const isPhoneAuthTestMode = () => import.meta.env.DEV;

const getRecaptchaElement = (containerId: string) => {
  if (typeof document === 'undefined') {
    throw new Error('Phone authentication is only available in the browser.');
  }

  const element = document.getElementById(containerId);
  if (!element) {
    throw new Error('Phone authentication is not ready yet. Please refresh and try again.');
  }

  return element;
};

const ensurePhoneAuthSettings = () => {
  auth.settings.appVerificationDisabledForTesting = isPhoneAuthTestMode();
};

export const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
};

export const clearPendingPhoneVerification = () => {
  pendingConfirmationResult = null;
  pendingVerification = null;
  clearRecaptcha();
};

const initRecaptcha = (
  containerId: string,
  recaptchaMode: RecaptchaMode,
) => {
  const container = getRecaptchaElement(containerId);
  ensurePhoneAuthSettings();
  container.innerHTML = '';
  clearRecaptcha();

  recaptchaVerifier = new RecaptchaVerifier(auth, container, {
    size: recaptchaMode === 'visible' ? 'normal' : 'invisible',
  });

  return recaptchaVerifier;
};

const buildPhoneAuthErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-phone-number':
        return 'Enter a valid mobile number with country code.';
      case 'auth/missing-phone-number':
        return 'Enter your mobile number to continue.';
      case 'auth/invalid-verification-code':
        return 'That OTP is incorrect. Please try again.';
      case 'auth/missing-verification-code':
        return 'Enter the 6-digit OTP to continue.';
      case 'auth/code-expired':
      case 'auth/session-expired':
        return 'That OTP expired. Request a new OTP and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts detected. Please wait a bit before trying again.';
      case 'auth/quota-exceeded':
        return 'OTP requests are temporarily unavailable. Please try again later.';
      case 'auth/captcha-check-failed':
        return 'reCAPTCHA verification failed. Please try again.';
      case 'auth/invalid-app-credential':
        return 'This device could not complete the invisible reCAPTCHA check.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      default:
        return error.message || fallbackMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

export const shouldUseVisibleRecaptcha = (error: unknown) =>
  Boolean(
    error instanceof FirebaseError && (
      error.code === 'auth/captcha-check-failed' ||
      error.code === 'auth/invalid-app-credential'
    ),
  ) ||
  Boolean(
    error &&
      typeof error === 'object' &&
      'cause' in error &&
      shouldUseVisibleRecaptcha((error as { cause?: unknown }).cause),
  );

export const requestPhoneVerification = async (
  phoneNumber: string,
  {
    containerId,
    recaptchaMode,
  }: {
    containerId: string;
    recaptchaMode: RecaptchaMode;
  },
): Promise<PendingPhoneVerification> => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  try {
    const verifier = initRecaptcha(containerId, recaptchaMode);
    pendingConfirmationResult = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
    pendingVerification = {
      phone: normalizedPhone,
      recaptchaMode,
    };

    return pendingVerification;
  } catch (error) {
    clearPendingPhoneVerification();
    throw Object.assign(
      new Error(
        buildPhoneAuthErrorMessage(
          error,
          'Unable to send the OTP right now. Please try again.',
        ),
      ),
      { cause: error },
    );
  }
};

export const resolvePhoneVerification = async (
  otpCode: string,
): Promise<User> => {
  const verificationCode = otpCode.trim();
  if (!verificationCode) {
    throw new Error('Enter the 6-digit OTP to continue.');
  }

  if (!pendingConfirmationResult) {
    throw new Error('Request a new OTP to continue.');
  }

  try {
    const credential = await pendingConfirmationResult.confirm(verificationCode);
    clearPendingPhoneVerification();
    return credential.user;
  } catch (error) {
    throw Object.assign(
      new Error(
        buildPhoneAuthErrorMessage(
          error,
          'Unable to verify the OTP right now. Please try again.',
        ),
      ),
      { cause: error },
    );
  }
};
