import {
  type ConfirmationResult,
  type User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { normalizePhoneNumber } from '../../../shared/phone';
import { auth } from './index';

let recaptchaVerifier: RecaptchaVerifier | null = null;

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

export const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
};

export const initRecaptcha = (containerId: string) => {
  const container = getRecaptchaElement(containerId);
  container.innerHTML = '';
  clearRecaptcha();

  recaptchaVerifier = new RecaptchaVerifier(auth, container, {
    size: 'invisible',
  });

  return recaptchaVerifier;
};

const getRecaptchaVerifier = () => {
  if (!recaptchaVerifier) {
    throw new Error('Phone verification is not ready. Please request a new OTP.');
  }

  return recaptchaVerifier;
};

export const sendOTP = async (phoneNumber: string) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const verifier = getRecaptchaVerifier();

  return signInWithPhoneNumber(auth, normalizedPhone, verifier);
};

export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<User> => {
  const verificationCode = code.trim();
  if (!verificationCode) {
    throw new Error('Enter the 6-digit OTP.');
  }

  const credential = await confirmationResult.confirm(verificationCode);
  clearRecaptcha();
  return credential.user;
};

export const getPhoneAuthErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-phone-number':
        return 'Enter a valid mobile number with country code.';
      case 'auth/missing-phone-number':
        return 'Enter your mobile number to continue.';
      case 'auth/invalid-verification-code':
        return 'That OTP is incorrect. Please try again.';
      case 'auth/code-expired':
      case 'auth/session-expired':
        return 'That OTP expired. Request a new OTP and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts detected. Please wait a bit before trying again.';
      case 'auth/quota-exceeded':
        return 'OTP requests are temporarily unavailable. Please try again later.';
      case 'auth/captcha-check-failed':
        return 'reCAPTCHA verification failed. Please try again.';
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
