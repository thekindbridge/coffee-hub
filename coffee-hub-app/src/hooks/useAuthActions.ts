import { Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { useAuthAdapter } from '../services/platform/authAdapter';
import type { GoogleAuthUser } from '../services/googleAuthService';
import { toAppServiceError } from '../services/serviceError';

type AuthActionsState = {
  googleUser: GoogleAuthUser | null;
  handleLogin: () => Promise<void>;
  isGoogleAuthReady: boolean;
  isLoggingIn: boolean;
  loginError: string;
};

export const useAuthActions = (): AuthActionsState => {
  const { googleUser, isGoogleLoginReady, loginWithGoogle } = useAuthAdapter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = useCallback(async () => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await loginWithGoogle();
    } catch (error) {
      const appError = toAppServiceError(
        error,
        'Unable to sign in with Google.',
        'network',
      );

      console.error('Google sign-in failed', error);
      setLoginError(appError.message);

      const isCancelledSignIn =
        appError.code === 'validation' &&
        appError.message.toLowerCase().includes('cancelled');

      if (!isCancelledSignIn) {
        Alert.alert('Google Sign-In Failed', appError.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  }, [loginWithGoogle]);

  return {
    googleUser,
    handleLogin,
    isGoogleAuthReady: isGoogleLoginReady,
    isLoggingIn,
    loginError,
  };
};
