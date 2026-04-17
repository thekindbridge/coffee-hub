import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { initializeGoogleAuth } from '../../services/browser/googleAuthService';
import { initializeAuthSession } from '../../services/firebase/authService';

export const AppProviders = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    void initializeAuthSession().catch(() => undefined);
    void initializeGoogleAuth().catch(() => undefined);
  }, []);

  return children;
};
