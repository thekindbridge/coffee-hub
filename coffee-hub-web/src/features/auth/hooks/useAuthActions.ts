import { useState } from 'react';
import { authAdapter } from '../../../services/platform/authAdapter';
import { getAppServiceErrorMessage } from '../../../services/platform/serviceError';

type AuthActionsState = {
  handleLogin: () => Promise<void>;
  isLoggingIn: boolean;
  loginError: string;
};

export const useAuthActions = (): AuthActionsState => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    console.log('STEP 1: Login button clicked');
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
