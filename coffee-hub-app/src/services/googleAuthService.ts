import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { signInWithGoogleTokens } from './firebase/authService';
import { AppServiceError, toAppServiceError } from './serviceError';

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = 'coffeehub';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || '';
const hasGoogleClientId = Boolean(
  GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID,
);

const createRedirectUri = () => {
  try {
    return AuthSession.getRedirectUrl('oauthredirect');
  } catch {
    return AuthSession.makeRedirectUri({
      scheme: APP_SCHEME,
      path: 'oauthredirect',
      native: `${APP_SCHEME}:/oauthredirect`,
    });
  }
};

const redirectUri = createRedirectUri();

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

export type GoogleAuthUser = {
  accessToken: string;
  email: string;
  familyName: string;
  givenName: string;
  id: string;
  idToken: string;
  isEmailVerified: boolean;
  name: string;
  photoUrl: string;
};

type PendingGoogleLogin = {
  reject: (error: AppServiceError) => void;
  resolve: (user: GoogleAuthUser) => void;
};

const fetchGoogleUser = async (
  accessToken: string,
  idToken: string,
): Promise<GoogleAuthUser> => {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AppServiceError('Unable to load your Google profile right now.', {
      code: 'network',
    });
  }

  const payload = (await response.json()) as GoogleUserInfoResponse;

  return {
    accessToken,
    email: payload.email?.trim() || '',
    familyName: payload.family_name?.trim() || '',
    givenName: payload.given_name?.trim() || '',
    id: payload.sub?.trim() || '',
    idToken,
    isEmailVerified: Boolean(payload.email_verified),
    name: payload.name?.trim() || payload.email?.trim() || 'Google user',
    photoUrl: payload.picture?.trim() || '',
  };
};

export const useGoogleAuthService = () => {
  const [googleUser, setGoogleUser] = useState<GoogleAuthUser | null>(null);
  const pendingGoogleLoginRef = useRef<PendingGoogleLogin | null>(null);
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    clientId: GOOGLE_WEB_CLIENT_ID || 'missing-google-web-client-id',
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response || !pendingGoogleLoginRef.current) {
      return;
    }

    if (response.type !== 'success' && response.type !== 'error') {
      return;
    }

    const pendingGoogleLogin = pendingGoogleLoginRef.current;

    const finalizeGoogleSignIn = async () => {
      if (response.type === 'error') {
        throw toAppServiceError(
          response.error ?? new Error('Unable to complete Google sign-in.'),
          'Unable to sign in with Google.',
          'network',
        );
      }

      const accessToken =
        response.authentication?.accessToken?.trim() ||
        response.params.access_token?.trim() ||
        '';
      const idToken =
        response.authentication?.idToken?.trim() ||
        response.params.id_token?.trim() ||
        '';

      if (!accessToken) {
        throw new AppServiceError('Google did not return an access token.', {
          code: 'validation',
        });
      }

      const user = await fetchGoogleUser(accessToken, idToken);
      setGoogleUser(user);

      await signInWithGoogleTokens({
        accessToken,
        idToken,
      });

      pendingGoogleLogin.resolve(user);
    };

    void finalizeGoogleSignIn()
      .catch(error => {
        pendingGoogleLogin.reject(
          toAppServiceError(error, 'Unable to sign in with Google.', 'network'),
        );
      })
      .finally(() => {
        if (pendingGoogleLoginRef.current === pendingGoogleLogin) {
          pendingGoogleLoginRef.current = null;
        }
      });
  }, [response]);

  const loginWithGoogle = useCallback(() => {
    if (!hasGoogleClientId) {
      return Promise.reject(
        new AppServiceError(
          'Missing Google sign-in client ID. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID or EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to your env.',
          { code: 'unsupported' },
        ),
      );
    }

    if (!request) {
      return Promise.reject(
        new AppServiceError(
          'Google sign-in is still preparing. Please try again in a moment.',
          { code: 'network' },
        ),
      );
    }

    if (pendingGoogleLoginRef.current) {
      return Promise.reject(
        new AppServiceError('Google sign-in is already in progress.', {
          code: 'validation',
        }),
      );
    }

    return new Promise<GoogleAuthUser>((resolve, reject) => {
      pendingGoogleLoginRef.current = { resolve, reject };

      void promptAsync()
        .then(result => {
          if (result.type === 'success') {
            return;
          }

          pendingGoogleLoginRef.current = null;

          if (result.type === 'cancel' || result.type === 'dismiss') {
            reject(
              new AppServiceError('Google sign-in was cancelled.', {
                code: 'validation',
              }),
            );
            return;
          }

          if (result.type === 'error') {
            reject(
              toAppServiceError(
                result.error ?? new Error('Unable to complete Google sign-in.'),
                'Unable to sign in with Google.',
                'network',
              ),
            );
            return;
          }

          reject(
            new AppServiceError('Unable to complete Google sign-in.', {
              code: 'network',
            }),
          );
        })
        .catch(error => {
          pendingGoogleLoginRef.current = null;
          reject(toAppServiceError(error, 'Unable to sign in with Google.', 'network'));
        });
    });
  }, [promptAsync, request]);

  return {
    googleUser,
    isGoogleLoginReady: hasGoogleClientId && Boolean(request),
    loginWithGoogle,
  };
};
