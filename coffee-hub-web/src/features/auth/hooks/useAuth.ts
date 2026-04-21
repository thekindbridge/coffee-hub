import { createContext, useContext } from 'react';
import { safeNormalizePhoneNumber } from '../../../../shared/phone';
import type { AuthUser } from '../../../services/auth/authService';
import type { DemoAuthRole } from '../../../../shared/demoAuth';

export type AuthState = {
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  isAuthReady: boolean;
  currentUserId: string;
  currentUserPhone: string;
  currentUserName: string;
  normalizedCurrentPhone: string;
  role: DemoAuthRole;
  user: AuthUser | null;
  login: (phoneNumber: string, pin: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const DEFAULT_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  isLoggedIn: false,
  isAuthReady: false,
  currentUserId: '',
  currentUserPhone: '',
  currentUserName: '',
  normalizedCurrentPhone: '',
  role: 'customer',
  user: null,
  login: async () => {
    throw new Error('AuthProvider is not ready.');
  },
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
  login,
  logout,
  role,
  user,
}: Omit<AuthState, 'normalizedCurrentPhone'>): AuthState => {
  const normalizedCurrentPhone = safeNormalizePhoneNumber(currentUserPhone);

  return {
    isAuthenticated,
    isLoggedIn,
    isAuthReady,
    currentUserId,
    currentUserPhone: normalizedCurrentPhone,
    currentUserName,
    normalizedCurrentPhone,
    role,
    user,
    login,
    logout,
  };
};

export const useAuth = (): AuthState => useContext(AuthContext);
