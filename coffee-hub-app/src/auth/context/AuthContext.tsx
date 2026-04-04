import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  loginWithEmail,
  logoutCurrentUser,
  resetAuthSession,
  type AuthUser,
} from '../../services/auth/authService';

type AuthContextValue = {
  currentUserEmail: string;
  currentUserId: string;
  error: string;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('[AuthContext] mount: forcing logged-out state');

    // Debug hard reset: keep auth state local to React state so Fast Refresh
    // or previous in-memory service state cannot auto-log the app in on launch.
    resetAuthSession('AuthProvider mount');
    setUser(null);
    setError('');
    setIsReady(true);

    return () => {
      console.log('[AuthContext] unmount');
    };
  }, []);

  useEffect(() => {
    console.log('[AuthContext] user:', user);
  }, [user]);

  const login = useCallback(async (email: string) => {
    setError('');
    console.log('[AuthContext] login:requested', email);

    try {
      const nextUser = await loginWithEmail(email);
      setUser(nextUser);
      console.log('[AuthContext] login:success', nextUser);
      return nextUser;
    } catch (authError) {
      console.error('[AuthContext] login:error', authError);
      setUser(null);
      const message = authError instanceof Error
        ? authError.message
        : 'Unable to sign in right now.';
      setError(message);
      throw authError;
    }
  }, []);

  const logout = useCallback(async () => {
    setError('');
    console.log('[AuthContext] logout:requested');

    try {
      await logoutCurrentUser();
      setUser(null);
      console.log('[AuthContext] logout:success');
    } catch (authError) {
      console.error('[AuthContext] logout:error', authError);
      const message = authError instanceof Error
        ? authError.message
        : 'Unable to sign out right now.';
      setError(message);
      throw authError;
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    currentUserEmail: user?.email || '',
    currentUserId: user?.uid || '',
    error,
    isAuthenticated: Boolean(user),
    isReady,
    login,
    logout,
    user,
  }), [
    error,
    isReady,
    login,
    logout,
    user,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuthContext must be used within AuthProvider.');
  }

  return value;
};

export const useAuth = useAuthContext;
