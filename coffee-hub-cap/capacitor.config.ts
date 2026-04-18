/// <reference types="@codetrix-studio/capacitor-google-auth" />

import type { CapacitorConfig } from '@capacitor/cli';

const GOOGLE_WEB_CLIENT_ID =
  '490208209104-kqj6tcv5iss5ej38iv0gj0pkgqtjct0p.apps.googleusercontent.com';
const GOOGLE_AUTH_SCOPES = ['profile', 'email'];
const DEFAULT_CAP_SERVER_URL = 'https://coffee-hub-inkollu.vercel.app/';
const CAP_SERVER_URL = process.env.CAP_SERVER_URL?.trim() || DEFAULT_CAP_SERVER_URL;
const CAP_SERVER_CLEAR_TEXT = CAP_SERVER_URL.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.coffeehub.app',
  appName: 'Coffee Hub',
  webDir: 'dist',
  backgroundColor: '#120c09',
  // The Android shell normally loads the deployed web app. Override
  // CAP_SERVER_URL for emulator/device debugging against a local server.
  server: {
    url: CAP_SERVER_URL,
    cleartext: CAP_SERVER_CLEAR_TEXT,
    errorPath: 'offline.html',
    allowNavigation: [
      '10.0.2.2',
      'localhost',
      'coffee-hub-inkollu.vercel.app',
      '*.vercel.app',
      '*.google.com',
      '*.googleusercontent.com',
      '*.gstatic.com',
      '*.firebaseapp.com',
      '*.googleapis.com',
    ],
  },
  plugins: {
    GoogleAuth: {
      // Native Android sign-in uses the web client ID so Google can mint
      // an ID token that Firebase accepts via signInWithCredential.
      scopes: GOOGLE_AUTH_SCOPES,
      serverClientId: GOOGLE_WEB_CLIENT_ID,
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: '#120c09',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    },
  },
};

export default config;
