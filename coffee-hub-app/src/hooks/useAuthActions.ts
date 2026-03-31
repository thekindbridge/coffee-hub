import { useCallback, useState } from 'react';
import { signInWithGoogleToken } from '../services/firebase/authService';
import { useGoogleAuth } from '../services/googleAuthService';
import { toAppServiceError } from '../services/serviceError';

type AuthActionsState = {
  handleLogin: () => Promise<void>;
  isLoginReady: boolean;
  isLoggingIn: boolean;
  loginError: string;
};

export const useAuthActions = (): AuthActionsState => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { signInAsync, isReady, setupError } = useGoogleAuth();

  const handleLogin = useCallback(async () => {
    if (!isReady) {
      setLoginError(
        setupError || 'Google Sign-In is still preparing. Please try again in a moment.',
      );
      return;
    }

    setLoginError('');
    setIsLoggingIn(true);

    try {
      const idToken = await signInAsync();
      if (!idToken) {
        return;
      }

      await signInWithGoogleToken(idToken);
    } catch (error) {
      const typedError = toAppServiceError(
        error,
        'Unable to sign in with Google right now.',
        'network',
      );
      setLoginError(typedError.message);
    } finally {
      setIsLoggingIn(false);
    }
  }, [isReady, setupError, signInAsync]);

  return {
    handleLogin,
    isLoginReady: isReady,
    isLoggingIn,
    loginError,
  };
};
