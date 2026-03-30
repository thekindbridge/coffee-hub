import { nativeAuthAdapter } from '../native/authAdapter';

export interface AuthAdapter {
  loginWithGoogle(): Promise<void>;
}

export const authAdapter: AuthAdapter = nativeAuthAdapter;
