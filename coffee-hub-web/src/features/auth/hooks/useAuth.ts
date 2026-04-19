import { useAuth as useClerkAuth, useUser } from '@clerk/react';

export type AuthState = {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  currentUserId: string;
  currentUserEmail: string;
  currentUserName: string;
  normalizedCurrentEmail: string;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const useAuth = (): AuthState => {
  const clerkAuth = useClerkAuth();
  const clerkUser = useUser();

  const currentUserEmail =
    clerkUser.user?.primaryEmailAddress?.emailAddress ||
    clerkUser.user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const currentUserName =
    clerkUser.user?.fullName ||
    [clerkUser.user?.firstName, clerkUser.user?.lastName].filter(Boolean).join(' ') ||
    '';

  return {
    isLoggedIn: Boolean(clerkAuth.isSignedIn && clerkAuth.userId),
    isAuthReady: clerkAuth.isLoaded && clerkUser.isLoaded,
    currentUserId: clerkAuth.userId || '',
    currentUserEmail,
    currentUserName,
    normalizedCurrentEmail: normalizeEmail(currentUserEmail),
  };
};
