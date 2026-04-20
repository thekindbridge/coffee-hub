import { useEffect, useMemo, useState } from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import type { CustomerProfile } from '../types';
import { getCurrentUserIdToken } from '../../../services/auth/authService';
import { syncUserProfileRequest } from '../../../services/api/userService';
import { auth as firebaseAuth } from '../../../services/firebase';
import { subscribeToUserProfile } from '../../../services/firebase/profileService';
import { EMPTY_PROFILE } from '../lib/firestoreMappers';

export type ProfileData = {
  isDataAccessReady: boolean;
  isProfileReady: boolean;
  profileSaved: CustomerProfile;
  profileSyncError: string;
};

export const useProfileData = ({
  currentUserEmail,
  currentUserId,
  currentUserName,
  isAuthReady,
  isLoggedIn,
}: {
  currentUserEmail: string;
  currentUserId: string;
  currentUserName: string;
  isAuthReady: boolean;
  isLoggedIn: boolean;
}): ProfileData => {
  const [profileSaved, setProfileSaved] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [hasProfileSnapshot, setHasProfileSnapshot] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [profileSyncError, setProfileSyncError] = useState('');

  const fallbackProfile = useMemo(() => ({
    ...EMPTY_PROFILE,
    clerkId: currentUserId,
    email: currentUserEmail,
    name: currentUserName,
  }), [currentUserEmail, currentUserId, currentUserName]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isLoggedIn || !currentUserId) {
      setProfileSaved(EMPTY_PROFILE);
      setHasProfileSnapshot(false);
      setIsFirebaseReady(false);
      setIsSyncingProfile(false);
      setProfileSyncError('');

      void signOut(firebaseAuth).catch(error => {
        console.error('Failed to clear Firebase session', error);
      });

      return;
    }
  }, [currentUserId, isAuthReady, isLoggedIn]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId || !isFirebaseReady) {
      return;
    }

    setHasProfileSnapshot(false);
    const unsubscribe = subscribeToUserProfile(
      currentUserId,
      profile => {
        setProfileSaved({
          ...fallbackProfile,
          ...profile,
          clerkId: profile.clerkId || currentUserId,
          email: profile.email || currentUserEmail,
          name: profile.name || currentUserName,
        });
        setHasProfileSnapshot(true);
      },
      error => {
        console.error('Failed to load user profile', error);
        setProfileSaved(fallbackProfile);
        setHasProfileSnapshot(true);
        setProfileSyncError('Unable to load your profile. Some role features may be limited.');
      },
    );

    return unsubscribe;
  }, [
    currentUserEmail,
    currentUserId,
    currentUserName,
    fallbackProfile,
    isAuthReady,
    isFirebaseReady,
    isLoggedIn,
  ]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId) {
      return;
    }

    let isCancelled = false;

    const syncProfile = async () => {
      setIsFirebaseReady(false);
      setIsSyncingProfile(true);
      setProfileSyncError('');

      try {
        const idToken = await getCurrentUserIdToken(true);
        if (!idToken) {
          throw new Error('Missing Clerk session token.');
        }

        const response = await syncUserProfileRequest(
          {
            email: currentUserEmail,
            name: currentUserName,
          },
          idToken,
        );

        if (isCancelled) {
          return;
        }

        setProfileSaved({
          ...fallbackProfile,
          ...response.profile,
          clerkId: response.profile.clerkId || currentUserId,
          email: response.profile.email || currentUserEmail,
          name: response.profile.name || currentUserName,
        });
        setHasProfileSnapshot(true);

        if (!response.firebaseCustomToken) {
          throw new Error('Missing Firebase custom token.');
        }

        if (firebaseAuth.currentUser?.uid !== currentUserId) {
          await signInWithCustomToken(firebaseAuth, response.firebaseCustomToken);
        }

        if (!isCancelled) {
          setIsFirebaseReady(true);
        }
      } catch (error) {
        console.error('Failed to sync Clerk user profile', error);
        if (!isCancelled) {
          setIsFirebaseReady(false);
          setProfileSyncError('Unable to sync your profile right now.');
        }
      } finally {
        if (!isCancelled) {
          setIsSyncingProfile(false);
        }
      }
    };

    void syncProfile();

    return () => {
      isCancelled = true;
    };
  }, [
    currentUserEmail,
    currentUserId,
    currentUserName,
    fallbackProfile,
    isAuthReady,
    isLoggedIn,
  ]);

  return {
    isDataAccessReady: !isLoggedIn || isFirebaseReady,
    isProfileReady:
      !isLoggedIn ||
      (!isSyncingProfile && (hasProfileSnapshot || Boolean(profileSyncError))),
    profileSaved,
    profileSyncError,
  };
};
