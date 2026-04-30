import { useEffect, useMemo, useState } from 'react';
import type { CustomerProfile } from '../types';
import {
  getPrimaryProfileAddress,
  isMeaningfulProfileName,
} from '../lib/firestoreMappers';
import { saveUserProfileReminderPreference } from '../../../services/firebase/profileService';
import { storageAdapter } from '../../../services/platform/storageAdapter';
import { getAppServiceErrorMessage } from '../../../services/platform/serviceError';

const PROFILE_REMINDER_SNOOZE_MS = 24 * 60 * 60 * 1000;
const PROFILE_REMINDER_SNOOZE_KEY = 'coffee_hub_profile_reminder_snooze';

const getSnoozeStorageKey = (currentUserId: string) =>
  currentUserId
    ? `${PROFILE_REMINDER_SNOOZE_KEY}:${currentUserId}`
    : PROFILE_REMINDER_SNOOZE_KEY;

export const useProfileCompletionReminder = ({
  currentUserId,
  isAuthReady,
  isProfileReady,
  isLoggedIn,
  isProfileOpen,
  isCustomer,
  profileSaved,
}: {
  currentUserId: string;
  isAuthReady: boolean;
  isProfileReady: boolean;
  isLoggedIn: boolean;
  isProfileOpen: boolean;
  isCustomer: boolean;
  profileSaved: CustomerProfile;
}) => {
  const [error, setError] = useState('');
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [isDismissedInSession, setIsDismissedInSession] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isProfileIncomplete = useMemo(() => {
    const hasMeaningfulName = isMeaningfulProfileName(
      profileSaved.name,
      profileSaved.phone,
    );
    const hasAddress = getPrimaryProfileAddress(profileSaved).length > 0;

    return !hasMeaningfulName || !hasAddress;
  }, [profileSaved]);

  useEffect(() => {
    setIsDismissedInSession(false);
    setError('');
    setIsVisible(false);
  }, [currentUserId]);

  useEffect(() => {
    if (
      !isAuthReady ||
      !isProfileReady ||
      !isLoggedIn ||
      !isCustomer ||
      !currentUserId ||
      isProfileOpen ||
      isDismissedInSession ||
      profileSaved.profileReminderDisabled ||
      !isProfileIncomplete
    ) {
      setIsVisible(false);
      return;
    }

    const snoozeUntilValue = storageAdapter.read(getSnoozeStorageKey(currentUserId));
    const snoozeUntil = Number(snoozeUntilValue || '0');
    const hasActiveSnooze = Number.isFinite(snoozeUntil) && snoozeUntil > Date.now();

    setIsVisible(!hasActiveSnooze);
  }, [
    currentUserId,
    isAuthReady,
    isCustomer,
    isDismissedInSession,
    isLoggedIn,
    isProfileReady,
    isProfileIncomplete,
    isProfileOpen,
    profileSaved.profileReminderDisabled,
  ]);

  const dismissForSession = () => {
    setError('');
    setIsDismissedInSession(true);
    setIsVisible(false);
  };

  const remindLater = () => {
    storageAdapter.write(
      getSnoozeStorageKey(currentUserId),
      `${Date.now() + PROFILE_REMINDER_SNOOZE_MS}`,
    );
    dismissForSession();
  };

  const disableReminder = async () => {
    if (!currentUserId) {
      return;
    }

    setIsSavingPreference(true);
    setError('');

    try {
      await saveUserProfileReminderPreference({
        currentUserId,
        disabled: true,
      });
      storageAdapter.remove(getSnoozeStorageKey(currentUserId));
      dismissForSession();
    } catch (caughtError) {
      setError(
        getAppServiceErrorMessage(
          caughtError,
          'Unable to update your reminder preference right now.',
        ),
      );
    } finally {
      setIsSavingPreference(false);
    }
  };

  return {
    disableReminder,
    dismissForSession,
    error,
    isSavingPreference,
    isVisible,
    remindLater,
  };
};
