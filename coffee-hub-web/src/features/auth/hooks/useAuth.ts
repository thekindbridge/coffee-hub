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

    const applySession = (session: {
      isLoggedIn: boolean;
      currentUserId: string;
      currentUserEmail: string;
    }) => {
      if (!isActive) {
        return;
      }

      setIsLoggedIn(session.isLoggedIn);
      setCurrentUserId(session.currentUserId);
      setCurrentUserEmail(session.currentUserEmail);
      setIsAuthReady(true);
    };

    const unsubscribe = subscribeToAuthSession(session => {
      applySession(session);
    });

    const fallbackTimeoutId = window.setTimeout(() => {
      applySession(getAuthSessionSnapshot());
    }, 5000);

    void initializeAuthState()
      .then(() => {
        window.clearTimeout(fallbackTimeoutId);
        applySession(getAuthSessionSnapshot());
      })
      .catch(() => {
        window.clearTimeout(fallbackTimeoutId);
        applySession(getAuthSessionSnapshot());
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
