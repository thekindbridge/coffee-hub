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
    setError('');
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string) => {
    setError('');

    try {
      const nextUser = await loginWithEmail(email);
      setUser(nextUser);
      return nextUser;
    } catch (authError) {
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

    try {
      await logoutCurrentUser();
      setUser(null);
    } catch (authError) {
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
