import { Capacitor } from '@capacitor/core';
import { ClerkProvider } from '@clerk/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { AppProviders } from './app/providers/AppProviders';
import './index.css';
import { registerServiceWorker } from './pwa/registerServiceWorker';

registerServiceWorker();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to your environment before starting the app.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      standardBrowser={!Capacitor.isNativePlatform()}
    >
      <AppProviders>
        <App />
      </AppProviders>
    </ClerkProvider>
  </StrictMode>,
);
