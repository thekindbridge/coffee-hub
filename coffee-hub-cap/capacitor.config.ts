import type { CapacitorConfig } from '@capacitor/cli';

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
