import { useLayoutEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { syncAuthRuntime } from '../../services/auth/authService';

export const AppProviders = ({ children }: PropsWithChildren) => {
  const clerkAuth = useAuth();
  const clerkUser = useUser();

  const currentUserEmail =
    clerkUser.user?.primaryEmailAddress?.emailAddress ||
    clerkUser.user?.emailAddresses?.[0]?.emailAddress ||
    '';

  useLayoutEffect(() => {
    const isLoaded = clerkAuth.isLoaded && clerkUser.isLoaded;

    syncAuthRuntime({
      currentUserEmail,
      currentUserId: clerkAuth.userId || '',
      getToken: clerkAuth.getToken,
      isLoaded,
      isLoggedIn: isLoaded && Boolean(clerkAuth.isSignedIn && clerkAuth.userId),
      signOut: clerkAuth.signOut,
    });

    return () => {
      syncAuthRuntime(null);
    };
  }, [
    clerkAuth.getToken,
    clerkAuth.isLoaded,
    clerkAuth.isSignedIn,
    clerkAuth.signOut,
    clerkAuth.userId,
    clerkUser.isLoaded,
    currentUserEmail,
  ]);

  return children;
};
