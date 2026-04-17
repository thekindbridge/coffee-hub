import { useEffect, useState } from 'react';
import {
  initializeAuthState,
  subscribeToAuthSession,
} from '../../../services/firebase/authService';

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
    let isActive = true;
    let hasResolvedAuthState = false;
    let fallbackTimeoutId = 0;

    const applySession = (session: {
      isLoggedIn: boolean;
      currentUserId: string;
      currentUserEmail: string;
    }) => {
      if (!isActive) {
        return;
      }

      hasResolvedAuthState = true;
      window.clearTimeout(fallbackTimeoutId);
      setIsLoggedIn(session.isLoggedIn);
      setCurrentUserId(session.currentUserId);
      setCurrentUserEmail(session.currentUserEmail);
      setIsAuthReady(true);
    };

    const unlockAuthUi = () => {
      if (!isActive || hasResolvedAuthState) {
        return;
      }

      setIsAuthReady(true);
    };

    const unsubscribe = subscribeToAuthSession(session => {
      applySession(session);
    });

    fallbackTimeoutId = window.setTimeout(() => {
      unlockAuthUi();
    }, 4000);

    void initializeAuthState()
      .catch(error => {
        console.warn('AUTH INITIALIZATION FAILED', error);
        unlockAuthUi();
      });

    return () => {
      isActive = false;
      window.clearTimeout(fallbackTimeoutId);
      unsubscribe();
    };
  }, []);

  return {
    isLoggedIn,
    isAuthReady,
    currentUserId,
    currentUserEmail,
    normalizedCurrentEmail: currentUserEmail.trim().toLowerCase(),
  };
};
