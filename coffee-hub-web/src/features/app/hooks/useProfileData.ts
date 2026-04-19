import { useEffect, useMemo, useState } from 'react';
import type { CustomerProfile } from '../types';
import { getCurrentUserIdToken } from '../../../services/auth/authService';
import { syncUserProfileRequest } from '../../../services/api/userService';
import { subscribeToUserProfile } from '../../../services/firebase/profileService';
import { EMPTY_PROFILE } from '../lib/firestoreMappers';

export type ProfileData = {
  isProfileReady: boolean;
  profileSaved: CustomerProfile;
  profileSyncError: string;
};

export const useProfileData = ({
  currentUserEmail,
  currentUserId,
  currentUserName,
  isLoggedIn,
}: {
  currentUserEmail: string;
  currentUserId: string;
  currentUserName: string;
  isLoggedIn: boolean;
}): ProfileData => {
  const [profileSaved, setProfileSaved] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [hasProfileSnapshot, setHasProfileSnapshot] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [profileSyncError, setProfileSyncError] = useState('');

  const fallbackProfile = useMemo(() => ({
    ...EMPTY_PROFILE,
    clerkId: currentUserId,
    email: currentUserEmail,
    name: currentUserName,
  }), [currentUserEmail, currentUserId, currentUserName]);

  useEffect(() => {
    if (!isLoggedIn || !currentUserId) {
      setProfileSaved(EMPTY_PROFILE);
      setHasProfileSnapshot(false);
      setIsSyncingProfile(false);
      setProfileSyncError('');
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
    isLoggedIn,
  ]);

  useEffect(() => {
    if (!isLoggedIn || !currentUserId || !currentUserEmail) {
      return;
    }

    let isCancelled = false;

    const syncProfile = async () => {
      setIsSyncingProfile(true);
      setProfileSyncError('');

      try {
        const idToken = await getCurrentUserIdToken(true);
        if (!idToken) {
          throw new Error('Missing Clerk session token.');
        }

        await syncUserProfileRequest(
          {
            email: currentUserEmail,
            name: currentUserName,
          },
          idToken,
        );
      } catch (error) {
        console.error('Failed to sync Clerk user profile', error);
        if (!isCancelled) {
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
  }, [currentUserEmail, currentUserId, currentUserName, isLoggedIn]);

  return {
    isProfileReady: !isLoggedIn || (hasProfileSnapshot && !isSyncingProfile),
    profileSaved,
    profileSyncError,
  };
};
