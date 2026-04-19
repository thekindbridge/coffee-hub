import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { ClerkProvider } from '@clerk/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { AppProviders } from './app/providers/AppProviders';
import './index.css';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { isNativeAuthPlatform, resolveIncomingAuthUrl } from './services/auth/authService';

registerServiceWorker();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to your environment before starting the app.');
}

const syncIncomingAuthUrl = async (incomingUrl?: string) => {
  if (!incomingUrl) {
    return;
  }

  const resolvedUrl = resolveIncomingAuthUrl(incomingUrl);
  if (!resolvedUrl || resolvedUrl === window.location.href) {
    return;
  }

  try {
    await Browser.close();
  } catch {
    // Browser.close() can fail if a native browser was not active.
  }

  window.location.assign(resolvedUrl);
};

const registerNativeAuthRedirects = async () => {
  if (!isNativeAuthPlatform()) {
    return;
  }

  await CapacitorApp.addListener('appUrlOpen', event => {
    void syncIncomingAuthUrl(event.url);
  });

  const launchUrl = await CapacitorApp.getLaunchUrl();
  await syncIncomingAuthUrl(launchUrl?.url);
};

void registerNativeAuthRedirects();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} standardBrowser={!isNativeAuthPlatform()}>
      <AppProviders>
        <App />
      </AppProviders>
    </ClerkProvider>
  </StrictMode>,
);
