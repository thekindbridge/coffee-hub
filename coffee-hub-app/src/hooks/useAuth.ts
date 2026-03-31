import { useEffect, useState } from 'react';
import {
  subscribeToAuthSession,
  type AuthUser,
} from '../services/auth/authService';

export type AuthState = {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  currentUserId: string;
  currentUserEmail: string;
  normalizedCurrentEmail: string;
  user: AuthUser | null;
};

export const useAuth = (): AuthState => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthSession(session => {
      setIsLoggedIn(session.isLoggedIn);
      setCurrentUserId(session.currentUserId);
      setCurrentUserEmail(session.currentUserEmail);
      setUser(session.user);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  return {
    isLoggedIn,
    isAuthReady,
    currentUserId,
    currentUserEmail,
    normalizedCurrentEmail: currentUserEmail.trim().toLowerCase(),
    user,
  };
};
