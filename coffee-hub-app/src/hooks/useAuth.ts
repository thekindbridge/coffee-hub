import { useAuthContext } from '../auth/context/AuthContext';
import type { AuthUser } from '../services/auth/authService';

export type AuthState = {
  authError: string;
  isLoggedIn: boolean;
  isAuthReady: boolean;
  currentUserId: string;
  currentUserEmail: string;
  normalizedCurrentEmail: string;
  user: AuthUser | null;
};

export const useAuth = (): AuthState => {
  const auth = useAuthContext();

  return {
    authError: auth.error,
    isLoggedIn: auth.isAuthenticated,
    isAuthReady: auth.isReady,
    currentUserId: auth.currentUserId,
    currentUserEmail: auth.currentUserEmail,
    normalizedCurrentEmail: auth.currentUserEmail.trim().toLowerCase(),
    user: auth.user,
  };
};
