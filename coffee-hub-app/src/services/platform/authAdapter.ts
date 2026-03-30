import type { GoogleAuthUser } from '../googleAuthService';
import { useNativeAuthAdapter } from '../native/authAdapter';

export interface AuthAdapter {
  googleUser: GoogleAuthUser | null;
  isGoogleLoginReady: boolean;
  loginWithGoogle(): Promise<GoogleAuthUser>;
}

export const useAuthAdapter = (): AuthAdapter => useNativeAuthAdapter();
