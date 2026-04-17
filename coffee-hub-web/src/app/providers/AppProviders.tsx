import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { initializeAuthState } from '../../services/firebase/authService';

export const AppProviders = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    void initializeAuthState().catch(() => undefined);
  }, []);

  return children;
};
