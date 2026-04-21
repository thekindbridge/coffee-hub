import { useEffect, useState } from 'react';
import type {
  CustomerProfile,
  NotificationSettings,
} from '../types';
import {
  buildProfileDraft,
  EMPTY_PROFILE,
} from '../lib/firestoreMappers';
import type { DeliveryAgent } from '../../../types';
import {
  saveUserNotificationSettings,
  saveUserProfile,
} from '../../../services/firebase/profileService';
import { bodyScrollAdapter } from '../../../services/platform/bodyScrollAdapter';

type UseProfileManagerParams = {
  currentUserId: string;
  currentUserPhone: string;
  isAdmin: boolean;
  isDeliveryAgent: boolean;
  profileSaved: CustomerProfile;
  deliveryAgents: DeliveryAgent[];
};

export type ProfileManagerState = {
  isProfileOpen: boolean;
  profileDraft: CustomerProfile;
  isProfileAddressExpanded: boolean;
  profileError: string;
  isProfileSaving: boolean;
  isProfileSavedToastVisible: boolean;
  handleOpenProfile: () => void;
  handleSaveProfile: () => Promise<void>;
  handleSaveProfileNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  setIsProfileOpen: (open: boolean) => void;
  setProfileDraft: (draft: CustomerProfile) => void;
  setIsProfileAddressExpanded: (expanded: boolean) => void;
};

export const useProfileManager = ({
  currentUserId,
  currentUserPhone,
  profileSaved,
  deliveryAgents,
}: UseProfileManagerParams): ProfileManagerState => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [isProfileAddressExpanded, setIsProfileAddressExpanded] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isProfileSavedToastVisible, setIsProfileSavedToastVisible] = useState(false);

  useEffect(() => {
    if (!isProfileOpen) {
      setProfileDraft(buildProfileDraft(profileSaved));
      setIsProfileAddressExpanded(false);
      setProfileError('');
      setIsProfileSavedToastVisible(false);
    }
  }, [profileSaved, isProfileOpen]);

  useEffect(() => {
    if (!isProfileSavedToastVisible) return;
    const id = setTimeout(() => setIsProfileSavedToastVisible(false), 1800);
    return () => clearTimeout(id);
  }, [isProfileSavedToastVisible]);

  useEffect(() => {
    bodyScrollAdapter.setLocked(isProfileOpen);
    return () => { bodyScrollAdapter.setLocked(false); };
  }, [isProfileOpen]);

  const handleOpenProfile = () => {
    setProfileDraft(buildProfileDraft({
      ...profileSaved,
      phone: profileSaved.phone || currentUserPhone,
      uid: profileSaved.uid || currentUserId,
    }));
    setIsProfileAddressExpanded(false);
    setProfileError('');
    setIsProfileSavedToastVisible(false);
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUserId) {
      setProfileError('Please sign in to save your profile.');
      return;
    }

    setIsProfileSaving(true);
    setProfileError('');

    try {
      await saveUserProfile({
        currentUserId,
        currentUserPhone,
        deliveryAgents,
        profileDraft: {
          ...profileDraft,
          uid: currentUserId,
          phone: currentUserPhone,
          role: profileSaved.role,
        },
      });

      setIsProfileSavedToastVisible(true);
    } catch (error) {
      console.error('Failed to save profile', error);
      setProfileError('Unable to save profile right now.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleSaveProfileNotificationSettings = async (settings: NotificationSettings) => {
    if (!currentUserId) {
      setProfileError('Please sign in to update notification settings.');
      return;
    }

    const previousSettings = profileDraft.notificationSettings;
    setProfileDraft(prev => ({
      ...prev,
      notificationSettings: settings,
    }));
    setProfileError('');

    try {
      await saveUserNotificationSettings({
        currentUserId,
        currentUserPhone,
        profileDraft: {
          ...profileDraft,
          phone: currentUserPhone,
          role: profileSaved.role,
        },
        settings,
      });
    } catch (error) {
      console.error('Failed to save notification settings', error);
      setProfileDraft(prev => ({
        ...prev,
        notificationSettings: previousSettings,
      }));
      setProfileError('Unable to save notification settings right now.');
    }
  };

  return {
    isProfileOpen,
    profileDraft,
    isProfileAddressExpanded,
    profileError,
    isProfileSaving,
    isProfileSavedToastVisible,
    handleOpenProfile,
    handleSaveProfile,
    handleSaveProfileNotificationSettings,
    setIsProfileOpen,
    setProfileDraft,
    setIsProfileAddressExpanded,
  };
};
