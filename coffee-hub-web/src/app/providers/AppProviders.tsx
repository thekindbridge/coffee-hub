import { useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import {
  AuthContext,
  DEFAULT_AUTH_STATE,
  toAuthState,
} from '../../features/auth/hooks/useAuth';

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [authState, setAuthState] = useState(DEFAULT_AUTH_STATE);

  useEffect(() => onAuthStateChanged(auth, firebaseUser => {
    if (!firebaseUser) {
      setAuthState({
        ...DEFAULT_AUTH_STATE,
        isAuthReady: true,
      });
      return;
    }

    setAuthState(toAuthState({
      isLoggedIn: true,
      isAuthReady: true,
      currentUserId: firebaseUser.uid,
      currentUserName: firebaseUser.displayName || '',
      currentUserPhone: firebaseUser.phoneNumber || '',
    }));
  }), []);

  const contextValue = useMemo(() => authState, [authState]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
