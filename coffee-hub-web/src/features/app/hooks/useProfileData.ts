import { useEffect, useMemo, useState } from 'react';
import type { CustomerProfile } from '../types';
import { getCurrentUserIdToken } from '../../../services/auth/authService';
import { syncUserProfileRequest } from '../../../services/api/userService';
import { subscribeToUserProfile } from '../../../services/firebase/profileService';
import { EMPTY_PROFILE } from '../lib/firestoreMappers';
import type { UserRole } from '../types';

export type ProfileData = {
  isDataAccessReady: boolean;
  isProfileReady: boolean;
  profileSaved: CustomerProfile;
  profileSyncError: string;
};

export const useProfileData = ({
  currentUserId,
  currentUserName,
  currentUserPhone,
  currentUserRole,
  isAuthReady,
  isLoggedIn,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserPhone: string;
  currentUserRole: UserRole;
  isAuthReady: boolean;
  isLoggedIn: boolean;
}): ProfileData => {
  const [profileSaved, setProfileSaved] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [hasProfileSnapshot, setHasProfileSnapshot] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [profileSyncError, setProfileSyncError] = useState('');

  const fallbackProfile = useMemo(() => ({
    ...EMPTY_PROFILE,
    uid: currentUserId,
    name: currentUserName,
    phone: currentUserPhone,
    role: currentUserRole,
  }), [currentUserId, currentUserName, currentUserPhone, currentUserRole]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isLoggedIn || !currentUserId) {
      setProfileSaved(EMPTY_PROFILE);
      setHasProfileSnapshot(false);
      setIsSyncingProfile(false);
      setProfileSyncError('');
    }
  }, [currentUserId, isAuthReady, isLoggedIn]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId) {
      return;
    }

    setHasProfileSnapshot(false);

    return subscribeToUserProfile(
      currentUserId,
      profile => {
        setProfileSaved({
          ...fallbackProfile,
          ...profile,
          uid: profile.uid || currentUserId,
          name: profile.name || currentUserName,
          phone: profile.phone || currentUserPhone,
          role: currentUserRole,
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
  }, [
    currentUserId,
    currentUserName,
    currentUserPhone,
    currentUserRole,
    fallbackProfile,
    isAuthReady,
    isLoggedIn,
  ]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId) {
      return;
    }

    let isCancelled = false;

    const syncProfile = async () => {
      setIsSyncingProfile(true);
      setProfileSyncError('');

      try {
        const idToken = await getCurrentUserIdToken(true);
        if (!idToken) {
          throw new Error('Missing authentication token.');
        }

        const response = await syncUserProfileRequest(
          {
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
          uid: response.profile.uid || currentUserId,
          name: response.profile.name || currentUserName,
          phone: response.profile.phone || currentUserPhone,
          role: currentUserRole,
        });
      } catch (error) {
        console.error('Failed to sync Firebase user profile', error);
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
  }, [
    currentUserId,
    currentUserName,
    currentUserPhone,
    currentUserRole,
    fallbackProfile,
    isAuthReady,
    isLoggedIn,
  ]);

  return {
    isDataAccessReady: !isLoggedIn || Boolean(currentUserId),
    isProfileReady:
      !isLoggedIn ||
      ((!isSyncingProfile && hasProfileSnapshot) || Boolean(profileSyncError)),
    profileSaved,
    profileSyncError,
  };
};
