import { ClerkProvider } from '@clerk/react';
import { StrictMode } from 'react';
import type { ComponentType, PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { AppProviders } from './app/providers/AppProviders';
import './index.css';
import { registerServiceWorker } from './pwa/registerServiceWorker';

registerServiceWorker();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
const EnvClerkProvider = ClerkProvider as ComponentType<PropsWithChildren<{
  afterSignOutUrl?: string;
}>>;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to your environment before starting the app.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EnvClerkProvider afterSignOutUrl="/">
      <AppProviders>
        <App />
      </AppProviders>
    </EnvClerkProvider>
  </StrictMode>,
);
