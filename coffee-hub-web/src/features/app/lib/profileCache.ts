import { safeNormalizePhoneNumber } from '../../../../shared/phone';
import type { CustomerProfile } from '../types';
import { storageAdapter } from '../../../services/platform/storageAdapter';

const PROFILE_CACHE_KEY_PREFIX = 'coffee_hub_profile_cache';
const PROFILE_PHONE_CACHE_KEY_PREFIX = 'coffee_hub_profile_phone_cache';

const getProfileCacheKey = (currentUserId: string) =>
  currentUserId ? `${PROFILE_CACHE_KEY_PREFIX}:${currentUserId}` : '';

const getProfilePhoneCacheKey = (currentUserPhone: string) => {
  const normalizedPhone = safeNormalizePhoneNumber(currentUserPhone);
  return normalizedPhone
    ? `${PROFILE_PHONE_CACHE_KEY_PREFIX}:${normalizedPhone}`
    : '';
};

const getProfileCacheKeys = ({
  currentUserId,
  currentUserPhone,
}: {
  currentUserId: string;
  currentUserPhone: string;
}) => Array.from(
  new Set(
    [
      getProfileCacheKey(currentUserId),
      getProfilePhoneCacheKey(currentUserPhone),
    ].filter(Boolean),
  ),
);

export const readCachedProfilePayload = ({
  currentUserId,
  currentUserPhone,
}: {
  currentUserId: string;
  currentUserPhone: string;
}) => {
  const cacheKeys = getProfileCacheKeys({
    currentUserId,
    currentUserPhone,
  });

  for (const cacheKey of cacheKeys) {
    const cachedValue = storageAdapter.read(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }
  }

  return null;
};

export const removeCachedProfilePayload = ({
  currentUserId,
  currentUserPhone,
}: {
  currentUserId: string;
  currentUserPhone: string;
}) => {
  getProfileCacheKeys({
    currentUserId,
    currentUserPhone,
  }).forEach(cacheKey => storageAdapter.remove(cacheKey));
};

export const writeCachedProfilePayload = ({
  currentUserId,
  currentUserPhone,
  serializedProfile,
}: {
  currentUserId: string;
  currentUserPhone: string;
  serializedProfile: string;
}) => {
  if (!serializedProfile) {
    return;
  }

  getProfileCacheKeys({
    currentUserId,
    currentUserPhone,
  }).forEach(cacheKey => storageAdapter.write(cacheKey, serializedProfile));
};

export const writeCachedProfile = ({
  currentUserId,
  currentUserPhone,
  profile,
}: {
  currentUserId: string;
  currentUserPhone: string;
  profile: CustomerProfile;
}) => {
  writeCachedProfilePayload({
    currentUserId,
    currentUserPhone: currentUserPhone || profile.phone,
    serializedProfile: JSON.stringify(profile),
  });
};
