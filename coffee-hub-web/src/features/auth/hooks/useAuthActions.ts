import { useEffect, useState } from 'react';
import { authAdapter } from '../../../services/platform/authAdapter';
import { getAppServiceErrorMessage } from '../../../services/platform/serviceError';
import { consumeGoogleAuthError } from '../../../services/browser/googleAuthService';

type AuthActionsState = {
  handleLogin: () => Promise<void>;
  isLoggingIn: boolean;
  loginError: string;
};

export const useAuthActions = (): AuthActionsState => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const pendingError = consumeGoogleAuthError();
    if (pendingError) {
      setLoginError(pendingError);
    }
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await authAdapter.loginWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed', error);
      setLoginError(getAppServiceErrorMessage(error, 'Unable to sign in with Google.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return {
    handleLogin,
    isLoggingIn,
    loginError,
  };
};
