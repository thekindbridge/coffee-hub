import { loginWithGoogle } from '../auth/authService';

export interface AuthAdapter {
  loginWithGoogle(): Promise<void>;
}

export const authAdapter: AuthAdapter = {
  loginWithGoogle: async () => {
    await loginWithGoogle();
  },
};
