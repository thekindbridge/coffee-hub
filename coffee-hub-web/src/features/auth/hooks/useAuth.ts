import { createContext, useContext } from 'react';
import { safeNormalizePhoneNumber } from '../../../../shared/phone';
import type { UserRole } from '../../app/types';
import type { AuthUser } from '../../../services/auth/authService';
import type { PendingPhoneVerification, RecaptchaMode } from '../../../services/firebase/phoneAuthService';

export type AuthState = {
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  isAuthReady: boolean;
  isOtpSent: boolean;
  currentUserId: string;
  currentUserPhone: string;
  currentUserName: string;
  normalizedCurrentPhone: string;
  pendingPhoneNumber: string;
  role: UserRole;
  user: AuthUser | null;
  requestOtp: (
    phoneNumber: string,
    recaptchaMode?: RecaptchaMode,
  ) => Promise<PendingPhoneVerification>;
  verifyOtp: (otpCode: string) => Promise<AuthUser>;
  cancelOtp: () => void;
  logout: () => Promise<void>;
};

export const DEFAULT_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  isLoggedIn: false,
  isAuthReady: false,
  isOtpSent: false,
  currentUserId: '',
  currentUserPhone: '',
  currentUserName: '',
  normalizedCurrentPhone: '',
  pendingPhoneNumber: '',
  role: 'customer',
  user: null,
  requestOtp: async () => {
    throw new Error('AuthProvider is not ready.');
  },
  verifyOtp: async () => {
    throw new Error('AuthProvider is not ready.');
  },
  cancelOtp: () => undefined,
  logout: async () => undefined,
};

export const AuthContext = createContext<AuthState>(DEFAULT_AUTH_STATE);

export const toAuthState = ({
  isAuthenticated,
  currentUserId,
  currentUserName,
  currentUserPhone,
  isAuthReady,
  isLoggedIn,
  pendingPhoneNumber,
  requestOtp,
  verifyOtp,
  cancelOtp,
  logout,
  role,
  user,
}: Omit<AuthState, 'isOtpSent' | 'normalizedCurrentPhone'>): AuthState => {
  const normalizedCurrentPhone = safeNormalizePhoneNumber(currentUserPhone);
  const normalizedPendingPhone = safeNormalizePhoneNumber(pendingPhoneNumber);

  return {
    isAuthenticated,
    isLoggedIn,
    isAuthReady,
    isOtpSent: Boolean(normalizedPendingPhone),
    currentUserId,
    currentUserPhone: normalizedCurrentPhone,
    currentUserName,
    normalizedCurrentPhone,
    pendingPhoneNumber: normalizedPendingPhone,
    role,
    user,
    requestOtp,
    verifyOtp,
    cancelOtp,
    logout,
  };
};

export const useAuth = (): AuthState => useContext(AuthContext);
