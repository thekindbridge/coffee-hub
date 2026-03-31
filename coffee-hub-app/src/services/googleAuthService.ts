import { useCallback, useEffect, useState } from 'react';
import { NativeModules, TurboModuleRegistry } from 'react-native';
import { AppServiceError } from './serviceError';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');
type GoogleSignInResponse = Awaited<
  ReturnType<GoogleSigninModule['GoogleSignin']['signIn']>
>;
type ExpoConstants = {
  appOwnership?: string;
  executionEnvironment?: string;
};

const GOOGLE_SCOPES = ['openid', 'profile', 'email'];
const GOOGLE_WEB_CLIENT_ID = `${process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''}`.trim();
const GOOGLE_SIGNIN_MODULE_NAME = 'RNGoogleSignin';

let googleSigninModulePromise: Promise<GoogleSigninModule> | null = null;
let isGoogleSigninConfigured = false;

const createGoogleAuthError = (message: string, cause?: unknown) => (
  new AppServiceError(message, {
    cause,
    code: 'network',
  })
);

const getExpoConstants = (): ExpoConstants | undefined => (
  NativeModules.NativeUnimoduleProxy?.modulesConstants?.ExponentConstants as
    | ExpoConstants
    | undefined
);

const isExpoGoRuntime = () => {
  const expoConstants = getExpoConstants();

  return (
    expoConstants?.appOwnership === 'expo' ||
    expoConstants?.executionEnvironment === 'storeClient'
  );
};

const hasNativeGoogleSigninModule = () => Boolean(
  TurboModuleRegistry.get(GOOGLE_SIGNIN_MODULE_NAME) ||
  NativeModules[GOOGLE_SIGNIN_MODULE_NAME]
);

const loadGoogleSigninModule = async () => {
  if (isExpoGoRuntime()) {
    throw new AppServiceError(
      'Google Sign-In is unavailable in Expo Go because it requires native Android code. Open a development build created with `npx expo run:android` to use Google login.',
      { code: 'unsupported' },
    );
  }

  if (!hasNativeGoogleSigninModule()) {
    throw new AppServiceError(
      'Native Google Sign-In is not available in this Android build. Rebuild the app with `npx expo run:android` after syncing the native project.',
      { code: 'unsupported' },
    );
  }

  try {
    if (!googleSigninModulePromise) {
      googleSigninModulePromise = import('@react-native-google-signin/google-signin');
    }

    return await googleSigninModulePromise;
  } catch (error) {
    googleSigninModulePromise = null;

    throw new AppServiceError(
      'Native Google Sign-In is not available in this Android build. Rebuild the app with `npx expo run:android` after syncing the native project.',
      {
        cause: error,
        code: 'unsupported',
      },
    );
  }
};

const configureGoogleSignin = async () => {
  if (isGoogleSigninConfigured) {
    return;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new AppServiceError(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in coffee-hub-app/.env.',
      { code: 'unsupported' },
    );
  }

  const { GoogleSignin } = await loadGoogleSigninModule();

  GoogleSignin.configure({
    scopes: GOOGLE_SCOPES,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  isGoogleSigninConfigured = true;
  console.log('GOOGLE SIGNIN CONFIGURED');
};

const readGoogleIdToken = async (
  googleSigninModule: GoogleSigninModule,
  response: GoogleSignInResponse,
) => {
  const { GoogleSignin, isSuccessResponse } = googleSigninModule;

  if (!isSuccessResponse(response)) {
    return '';
  }

  if (response.data.idToken) {
    return response.data.idToken;
  }

  const tokens = await GoogleSignin.getTokens();
  return tokens.idToken || '';
};

export function useGoogleAuth() {
  const [isReady, setIsReady] = useState(false);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        await configureGoogleSignin();

        if (!isMounted) {
          return;
        }

        setSetupError('');
        setIsReady(true);
      } catch (error) {
        if (error instanceof AppServiceError && error.code === 'unsupported') {
          console.warn(error.message);
        } else {
          console.error('Failed to configure Google Sign-In', error);
        }

        if (!isMounted) {
          return;
        }

        setSetupError(
          error instanceof Error
            ? error.message
            : 'Google Sign-In is unavailable in this build.',
        );
        setIsReady(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const signInAsync = useCallback(async () => {
    try {
      await configureGoogleSignin();
      const googleSigninModule = await loadGoogleSigninModule();
      const {
        GoogleSignin,
        isErrorWithCode,
        isSuccessResponse,
        statusCodes,
      } = googleSigninModule;

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();
      console.log('FULL GOOGLE RESPONSE:', response);

      if (!isSuccessResponse(response)) {
        return '';
      }

      const idToken = await readGoogleIdToken(googleSigninModule, response);
      console.log('GOOGLE ID TOKEN:', idToken);

      if (!idToken) {
        throw createGoogleAuthError(
          'Google Sign-In succeeded, but no id_token was returned. Check the Web Client ID and Firebase/Google Cloud Android app setup.',
          response,
        );
      }

      return idToken;
    } catch (error) {
      if (error instanceof AppServiceError) {
        throw error;
      }

      const googleSigninModule = await loadGoogleSigninModule();
      const { isErrorWithCode, statusCodes } = googleSigninModule;

      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return '';
        }

        if (error.code === statusCodes.IN_PROGRESS) {
          throw createGoogleAuthError('Google Sign-In is already in progress.', error);
        }

        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw createGoogleAuthError(
            'Google Play Services is unavailable or needs an update on this device.',
            error,
          );
        }
      }

      throw createGoogleAuthError(
        'Native Google Sign-In failed. If this becomes DEVELOPER_ERROR, make sure Firebase/Google Cloud has an Android OAuth client for com.pavankumar3232.coffeehubapp with this build SHA-1.',
        error,
      );
    }
  }, []);

  return {
    isReady,
    signInAsync,
    setupError,
  };
}
