/// <reference types="@codetrix-studio/capacitor-google-auth" />

import type { CapacitorConfig } from '@capacitor/cli';

const GOOGLE_WEB_CLIENT_ID =
  '490208209104-kqj6tcv5iss5ej38iv0gj0pkgqtjct0p.apps.googleusercontent.com';
const GOOGLE_AUTH_SCOPES = ['profile', 'email'];

const config: CapacitorConfig = {
  appId: 'com.coffeehub.app',
  appName: 'Coffee Hub',
  webDir: 'dist',
  backgroundColor: '#120c09',
  server: {
    url: 'https://coffee-hub-inkollu.vercel.app/',
    cleartext: false,
    errorPath: 'offline.html',
    allowNavigation: [
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
      androidClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: GOOGLE_AUTH_SCOPES,
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
