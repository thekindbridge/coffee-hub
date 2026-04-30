import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomerProfile } from '../types';
import { getCurrentUserIdToken } from '../../../services/auth/authService';
import { syncUserProfileRequest } from '../../../services/api/userService';
import { subscribeToUserProfile } from '../../../services/firebase/profileService';
import { storageAdapter } from '../../../services/platform/storageAdapter';
import {
  EMPTY_PROFILE,
  ensureProfileAddresses,
  normalizeNotificationSettings,
} from '../lib/firestoreMappers';
import type { UserRole } from '../types';

export type ProfileData = {
  isDataAccessReady: boolean;
  isProfileReady: boolean;
  profileSaved: CustomerProfile;
  profileSyncError: string;
};

const PROFILE_CACHE_KEY_PREFIX = 'coffee_hub_profile_cache';

const getProfileCacheKey = (currentUserId: string) =>
  `${PROFILE_CACHE_KEY_PREFIX}:${currentUserId}`;

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
  const profileCacheKey = currentUserId ? getProfileCacheKey(currentUserId) : '';

  const mergeProfileWithFallback = useCallback((profile: Partial<CustomerProfile>): CustomerProfile => {
    const addresses = ensureProfileAddresses(
      Array.isArray(profile.addresses)
        ? profile.addresses.map(address => `${address || ''}`)
        : fallbackProfile.addresses,
    );
    const nextAddress = `${profile.address || ''}`.trim();

    if (nextAddress && !addresses[0].trim()) {
      addresses[0] = nextAddress;
    }

    return {
      ...fallbackProfile,
      ...profile,
      uid: profile.uid || currentUserId,
      name: profile.name || currentUserName,
      phone: profile.phone || currentUserPhone,
      role: currentUserRole,
      address: nextAddress || addresses[0].trim(),
      addresses,
      notificationSettings: normalizeNotificationSettings(profile.notificationSettings),
      profileReminderDisabled: profile.profileReminderDisabled === true,
    };
  }, [
    currentUserId,
    currentUserName,
    currentUserPhone,
    currentUserRole,
    fallbackProfile,
  ]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isLoggedIn || !currentUserId) {
      setProfileSaved(EMPTY_PROFILE);
      setHasProfileSnapshot(false);
      setIsSyncingProfile(false);
      setProfileSyncError('');
      return;
    }

    const cachedProfile = storageAdapter.read(profileCacheKey);
    if (!cachedProfile) {
      setProfileSaved(fallbackProfile);
      return;
    }

    try {
      const parsedProfile = JSON.parse(cachedProfile) as Partial<CustomerProfile>;
      setProfileSaved(mergeProfileWithFallback(parsedProfile));
    } catch (error) {
      console.warn('Ignoring invalid cached profile payload.', error);
      storageAdapter.remove(profileCacheKey);
      setProfileSaved(fallbackProfile);
    }
  }, [
    currentUserId,
    fallbackProfile,
    isAuthReady,
    isLoggedIn,
    mergeProfileWithFallback,
    profileCacheKey,
  ]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUserId) {
      return;
    }

    setHasProfileSnapshot(false);

    return subscribeToUserProfile(
      currentUserId,
      profile => {
        const nextProfile = mergeProfileWithFallback(profile);
        setProfileSaved(nextProfile);
        setHasProfileSnapshot(true);
        storageAdapter.write(profileCacheKey, JSON.stringify(nextProfile));
      },
      error => {
        console.error('Failed to load user profile', error);
        setProfileSaved(previousProfile =>
          previousProfile.uid ? previousProfile : fallbackProfile,
        );
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
    mergeProfileWithFallback,
    profileCacheKey,
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
        const idToken = await getCurrentUserIdToken();
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

        const nextProfile = mergeProfileWithFallback(response.profile);
        setProfileSaved(nextProfile);
        storageAdapter.write(profileCacheKey, JSON.stringify(nextProfile));
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
    isAuthReady,
    isLoggedIn,
    mergeProfileWithFallback,
    profileCacheKey,
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
