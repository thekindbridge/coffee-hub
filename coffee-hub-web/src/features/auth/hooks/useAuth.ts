import { useEffect, useState } from 'react';
import {
  getAuthSessionSnapshot,
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
    let hasRecoveredAuthenticatedUser = false;
    let fallbackTimeoutId = 0;

    const applySession = (session: {
      isLoggedIn: boolean;
      currentUserId: string;
      currentUserEmail: string;
    }) => {
      if (!isActive) {
        return;
      }

      if (session.isLoggedIn) {
        hasRecoveredAuthenticatedUser = true;
        window.clearTimeout(fallbackTimeoutId);
      }

      setIsLoggedIn(session.isLoggedIn);
      setCurrentUserId(session.currentUserId);
      setCurrentUserEmail(session.currentUserEmail);
      setIsAuthReady(true);
    };

    const recoverFromCurrentUser = () => {
      if (!isActive) {
        return;
      }

      const fallbackSession = getAuthSessionSnapshot();

      if (fallbackSession.isLoggedIn) {
        applySession(fallbackSession);
        return;
      }

      setIsAuthReady(true);
    };

    const unsubscribe = subscribeToAuthSession(session => {
      applySession(session);

      if (!session.isLoggedIn && !hasRecoveredAuthenticatedUser) {
        const fallbackSession = getAuthSessionSnapshot();
        if (fallbackSession.isLoggedIn) {
          applySession(fallbackSession);
        }
      }
    });

    fallbackTimeoutId = window.setTimeout(() => {
      recoverFromCurrentUser();
    }, 4000);

    void initializeAuthState()
      .catch(error => {
        console.warn('AUTH INITIALIZATION FAILED', error);
        recoverFromCurrentUser();
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
