import { useCallback, useState } from 'react';
import { loginAsDummyUser } from '../services/auth/authService';

type AuthActionsState = {
  handleLogin: () => Promise<void>;
  isLoggingIn: boolean;
};

export const useAuthActions = (): AuthActionsState => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = useCallback(async () => {
    setIsLoggingIn(true);

    try {
      await loginAsDummyUser();
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  return {
    handleLogin,
    isLoggingIn,
  };
};
