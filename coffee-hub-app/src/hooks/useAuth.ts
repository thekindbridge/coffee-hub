import { useEffect, useState } from 'react';
import { subscribeToAuthSession } from '../services/firebase/authService';

export type AuthState = {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  currentUserId: string;
  currentUserEmail: string;
  normalizedCurrentEmail: string;
};

export const useAuth = (): AuthState => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToAuthSession(session => {
      setIsLoggedIn(session.isLoggedIn);
      setCurrentUserId(session.currentUserId);
      setCurrentUserEmail(session.currentUserEmail);
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
  };
};
