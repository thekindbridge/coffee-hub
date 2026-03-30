import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Prompt, ResponseType } from 'expo-auth-session';
import { AppServiceError, toAppServiceError } from '../serviceError';
import { signInWithGoogleIdToken } from '../firebase/authService';
import type { AuthAdapter } from '../platform/authAdapter';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
] as const;

const readEnvValue = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const getGoogleClientId = () => {
  const clientId = readEnvValue(
    'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
  );

  if (!clientId) {
    throw new AppServiceError(
      'Missing Google sign-in client ID. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to your mobile env.',
      { code: 'unsupported' },
    );
  }

  return clientId;
};

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'coffeehub',
  path: 'oauthredirect',
  native: 'coffeehub:/oauthredirect',
});

export const nativeAuthAdapter: AuthAdapter = {
  loginWithGoogle: async () => {
    try {
      const clientId = getGoogleClientId();
      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        responseType: ResponseType.Code,
        usePKCE: true,
        scopes: [...GOOGLE_SCOPES],
        extraParams: {
          prompt: Prompt.SelectAccount,
          nonce: Crypto.randomUUID().replace(/-/g, ''),
        },
      });

      await WebBrowser.warmUpAsync().catch(() => undefined);
      await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);

      const result = await request.promptAsync(GOOGLE_DISCOVERY);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new AppServiceError('Google sign-in was cancelled.', {
          code: 'validation',
        });
      }

      if (result.type !== 'success') {
        throw new AppServiceError('Unable to complete Google sign-in.', {
          code: 'network',
        });
      }

      if (!result.params.code) {
        throw new AppServiceError('Google did not return an authorization code.', {
          code: 'validation',
        });
      }

      const tokenResponse = await new AuthSession.AccessTokenRequest({
        clientId,
        redirectUri,
        code: result.params.code,
        scopes: [...GOOGLE_SCOPES],
        extraParams: {
          code_verifier: request.codeVerifier || '',
        },
      }).performAsync(GOOGLE_DISCOVERY);

      const idToken = tokenResponse.idToken || '';

      if (!idToken) {
        throw new AppServiceError('Google did not return an ID token.', {
          code: 'validation',
        });
      }

      await signInWithGoogleIdToken(idToken);
    } catch (error) {
      throw toAppServiceError(error, 'Unable to sign in with Google.', 'network');
    } finally {
      void WebBrowser.coolDownAsync().catch(() => undefined);
    }
  },
};
