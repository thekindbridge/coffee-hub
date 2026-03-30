import { useCallback, useState } from 'react';
import { authAdapter } from '../services/platform/authAdapter';
import { toAppServiceError } from '../services/serviceError';

type AuthActionsState = {
  handleLogin: () => Promise<void>;
  isLoggingIn: boolean;
  loginError: string;
};

export const useAuthActions = (): AuthActionsState => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = useCallback(async () => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await authAdapter.loginWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed', error);
      setLoginError(
        toAppServiceError(error, 'Unable to sign in with Google.', 'network').message,
      );
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  return {
    handleLogin,
    isLoggingIn,
    loginError,
  };
};
