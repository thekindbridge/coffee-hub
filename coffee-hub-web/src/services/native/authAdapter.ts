import type { AuthAdapter } from '../platform/authAdapter';
import { AppServiceError } from '../platform/serviceError';

export const nativeAuthAdapter: AuthAdapter = {
  loginWithGoogle: async () => {
    throw new AppServiceError(
      'Native Google sign-in is not wired up yet for the Expo app.',
      { code: 'unsupported' },
    );
  },
};
