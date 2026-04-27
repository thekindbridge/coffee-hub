import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { AppProviders } from './app/providers/AppProviders';
import { applyAppThemeToDocument, readStoredAppTheme } from './features/theme/theme';
import './index.css';
import { registerServiceWorker } from './pwa/registerServiceWorker';

registerServiceWorker();
applyAppThemeToDocument(readStoredAppTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
