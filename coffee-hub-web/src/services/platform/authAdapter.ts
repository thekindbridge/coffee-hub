import { loginWithGooglePopup } from '../browser/googleAuthService';

export interface AuthAdapter {
  loginWithGoogle(): Promise<void>;
}

export const authAdapter: AuthAdapter = {
  loginWithGoogle: async () => {
    await loginWithGooglePopup();
  },
};
