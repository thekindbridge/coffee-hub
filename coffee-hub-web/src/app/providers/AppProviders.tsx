import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  AuthContext,
  toAuthState,
} from '../../features/auth/hooks/useAuth';
import {
  loginWithPin,
  logoutCurrentUser,
  restoreAuthSession,
  type AuthUser,
} from '../../services/auth/authService';

const buildContextState = (
  user: AuthUser | null,
  login: (phoneNumber: string, pin: string) => Promise<AuthUser>,
  logout: () => Promise<void>,
) => toAuthState({
  isAuthenticated: Boolean(user),
  isLoggedIn: Boolean(user),
  isAuthReady: true,
  currentUserId: user?.uid || '',
  currentUserName: user?.displayName || '',
  currentUserPhone: user?.phone || '',
  login,
  logout,
  role: user?.role || 'customer',
  user,
});

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(async () => {
    await logoutCurrentUser();
    setUser(null);
  }, []);

  const login = useCallback(async (phoneNumber: string, pin: string) => {
    const nextUser = await loginWithPin(phoneNumber, pin);
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    setUser(restoreAuthSession());
  }, []);

  const contextValue = useMemo(
    () => buildContextState(user, login, logout),
    [login, logout, user],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
