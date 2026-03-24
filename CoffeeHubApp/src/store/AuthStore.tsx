import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type AuthUser = {
  id: string;
  email: string;
};

type SignInPayload = Partial<AuthUser>;

type AuthContextValue = {
  isAuthenticated: boolean;
  signIn: (payload?: SignInPayload) => void;
  signOut: () => void;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const signIn = useCallback((payload?: SignInPayload) => {
    setUser({
      email: payload?.email ?? 'guest@coffeehub.app',
      id: payload?.id ?? 'coffeehub-user',
    });
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      signIn,
      signOut,
      user,
    }),
    [signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthStore() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthStore must be used within an AuthProvider.');
  }

  return context;
}
