import { createContext, useContext } from 'react';
import { safeNormalizePhoneNumber } from '../../../../shared/phone';

export type AuthState = {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  currentUserId: string;
  currentUserPhone: string;
  currentUserName: string;
  normalizedCurrentPhone: string;
};

export const DEFAULT_AUTH_STATE: AuthState = {
  isLoggedIn: false,
  isAuthReady: false,
  currentUserId: '',
  currentUserPhone: '',
  currentUserName: '',
  normalizedCurrentPhone: '',
};

export const AuthContext = createContext<AuthState>(DEFAULT_AUTH_STATE);

export const toAuthState = ({
  currentUserId,
  currentUserName,
  currentUserPhone,
  isAuthReady,
  isLoggedIn,
}: Omit<AuthState, 'normalizedCurrentPhone'>): AuthState => {
  const normalizedCurrentPhone = safeNormalizePhoneNumber(currentUserPhone);

  return {
    isLoggedIn,
    isAuthReady,
    currentUserId,
    currentUserPhone: normalizedCurrentPhone,
    currentUserName,
    normalizedCurrentPhone,
  };
};

export const useAuth = (): AuthState => useContext(AuthContext);
