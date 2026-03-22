import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../services/firebase';

export type AuthState = {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  currentUserId: string;
  currentUserEmail: string;
  normalizedCurrentEmail: string;
};

/**
 * Subscribes to Firebase Auth state changes.
 * Provides the current user identity and login status.
 */
export const useAuthState = (): AuthState => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUserId(user.uid);
        setCurrentUserEmail(user.email || '');
      } else {
        setIsLoggedIn(false);
        setCurrentUserId('');
        setCurrentUserEmail('');
      }
      setIsAuthReady(true);
    });

    return () => {
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
