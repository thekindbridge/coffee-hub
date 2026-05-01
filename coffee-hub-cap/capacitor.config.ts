/// <reference types="@capacitor/geolocation" />

import type { CapacitorConfig } from '@capacitor/cli';

const DEFAULT_CAP_SERVER_URL = 'https://coffee-hub-inkollu.vercel.app/';
const CAP_SERVER_URL = process.env.CAP_SERVER_URL?.trim() || DEFAULT_CAP_SERVER_URL;
const CAP_SERVER_CLEAR_TEXT = CAP_SERVER_URL.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.coffeehub.app',
  appName: 'Coffee Hub',
  webDir: 'dist',
  backgroundColor: '#120c09',
  android: {
    allowMixedContent: false,
    backgroundColor: '#120c09',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
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
      '*.firebaseapp.com',
      '*.googleapis.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      launchFadeOutDuration: 120,
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
