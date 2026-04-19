import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { useClerk } from '@clerk/react';
import {
  initializeAuthState,
  syncAuthRuntime,
} from '../../services/auth/authService';

export const AppProviders = ({ children }: PropsWithChildren) => {
  const clerk = useClerk();

  useEffect(() => {
    void initializeAuthState().catch(() => undefined);
  }, []);

  useEffect(() => {
    syncAuthRuntime(clerk);
  }, [
    clerk,
    clerk.client,
    clerk.isSignedIn,
    clerk.loaded,
    clerk.session,
    clerk.user,
  ]);

  return children;
};
