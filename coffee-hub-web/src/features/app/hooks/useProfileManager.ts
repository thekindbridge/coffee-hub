import { useEffect, useState } from 'react';
import type {
  CustomerProfile,
  NotificationSettings,
  StaffProfile,
  StaffRole,
} from '../types';
import {
  buildProfileDraft,
  buildStaffProfileDraft,
  EMPTY_PROFILE,
  EMPTY_STAFF_PROFILE,
} from '../lib/firestoreMappers';
import type { DeliveryAgent } from '../../../types';
import {
  saveCustomerNotificationSettings,
  saveCustomerProfile,
  saveStaffNotificationSettings,
  saveStaffProfile,
} from '../../../services/firebase/profileService';
import { setBodyScrollLocked } from '../../../services/browser/domService';

type UseProfileManagerParams = {
  currentUserId: string;
  currentUserEmail: string;
  isAdmin: boolean;
  isDeliveryAgent: boolean;
  profileSaved: CustomerProfile;
  staffProfileSaved: StaffProfile;
  deliveryAgents: DeliveryAgent[];
};

export type ProfileManagerState = {
  // Customer profile
  isProfileOpen: boolean;
  profileDraft: CustomerProfile;
  isProfileAddressExpanded: boolean;
  profileError: string;
  isProfileSaving: boolean;
  isProfileSavedToastVisible: boolean;
  // Staff profile
  isStaffProfileOpen: boolean;
  staffProfileDraft: StaffProfile;
  staffProfileError: string;
  isStaffProfileSaving: boolean;
  isStaffProfileSavedToastVisible: boolean;
  // Handlers
  handleOpenProfile: () => void;
  handleOpenStaffProfile: () => void;
  handleSaveProfile: () => Promise<void>;
  handleSaveStaffProfile: () => Promise<void>;
  handleSaveProfileNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  handleSaveStaffNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  setIsProfileOpen: (open: boolean) => void;
  setProfileDraft: (draft: CustomerProfile) => void;
  setIsProfileAddressExpanded: (expanded: boolean) => void;
  setIsStaffProfileOpen: (open: boolean) => void;
  setStaffProfileDraft: (draft: StaffProfile) => void;
};

/**
 * Manages all customer-profile and staff-profile drawer state and Firestore writes.
 * Extracted from App.tsx to keep the root component slim.
 */
export const useProfileManager = ({
  currentUserId,
  currentUserEmail,
  isAdmin,
  isDeliveryAgent,
  profileSaved,
  staffProfileSaved,
  deliveryAgents,
}: UseProfileManagerParams): ProfileManagerState => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [isProfileAddressExpanded, setIsProfileAddressExpanded] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isProfileSavedToastVisible, setIsProfileSavedToastVisible] = useState(false);

  const [isStaffProfileOpen, setIsStaffProfileOpen] = useState(false);
  const [staffProfileDraft, setStaffProfileDraft] = useState<StaffProfile>(EMPTY_STAFF_PROFILE);
  const [staffProfileError, setStaffProfileError] = useState('');
  const [isStaffProfileSaving, setIsStaffProfileSaving] = useState(false);
  const [isStaffProfileSavedToastVisible, setIsStaffProfileSavedToastVisible] = useState(false);

  // Sync customer profile draft when drawer closes or saved profile changes
  useEffect(() => {
    if (!isProfileOpen) {
      setProfileDraft(buildProfileDraft(profileSaved));
      setIsProfileAddressExpanded(false);
    }
  }, [profileSaved, isProfileOpen]);

  // Sync staff profile draft when drawer closes or saved profile changes
  useEffect(() => {
    if (!isStaffProfileOpen) {
      setStaffProfileDraft(buildStaffProfileDraft(staffProfileSaved));
      setStaffProfileError('');
      setIsStaffProfileSavedToastVisible(false);
    }
  }, [staffProfileSaved, isStaffProfileOpen]);

  // Auto-dismiss customer profile toast
  useEffect(() => {
    if (!isProfileSavedToastVisible) return;
    const id = setTimeout(() => setIsProfileSavedToastVisible(false), 1800);
    return () => clearTimeout(id);
  }, [isProfileSavedToastVisible]);

  // Lock body scroll while staff profile drawer is open
  useEffect(() => {
    setBodyScrollLocked(isStaffProfileOpen);
    return () => { setBodyScrollLocked(false); };
  }, [isStaffProfileOpen]);

  const handleOpenProfile = () => {
    setProfileDraft(buildProfileDraft(profileSaved));
    setIsProfileAddressExpanded(false);
    setProfileError('');
    setIsProfileSavedToastVisible(false);
    setIsProfileOpen(true);
  };

  const handleOpenStaffProfile = () => {
    const role: StaffRole = isAdmin ? 'admin' : 'agent';
    const seededEmail = staffProfileSaved.email || currentUserEmail;
    setStaffProfileDraft(buildStaffProfileDraft({ ...staffProfileSaved, role, email: seededEmail }));
    setStaffProfileError('');
    setIsStaffProfileSavedToastVisible(false);
    setIsStaffProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUserId) {
      setProfileError('Please sign in to save your profile.');
      return;
    }
    setIsProfileSaving(true);
    setProfileError('');
    try {
      await saveCustomerProfile(currentUserId, profileDraft);
      setIsProfileSavedToastVisible(true);
    } catch (error) {
      console.error('Failed to save customer profile', error);
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

    setProfileDraft(prev => ({
      ...prev,
      notificationSettings: settings,
    }));
    setProfileError('');

    try {
      await saveCustomerNotificationSettings(currentUserId, settings);
    } catch (error) {
      console.error('Failed to save customer notification settings', error);
      setProfileError('Unable to save notification settings right now.');
    }
  };

  const handleSaveStaffProfile = async () => {
    if (!currentUserId) {
      setStaffProfileError('Please sign in to save your profile.');
      return;
    }
    setIsStaffProfileSaving(true);
    setStaffProfileError('');
    try {
      await saveStaffProfile({
        currentUserEmail,
        currentUserId,
        deliveryAgents,
        isAdmin,
        staffProfileDraft,
      });

      setIsStaffProfileSavedToastVisible(true);
    } catch (error) {
      console.error('Failed to save staff profile', error);
      setStaffProfileError('Unable to save profile right now.');
    } finally {
      setIsStaffProfileSaving(false);
    }
  };

  const handleSaveStaffNotificationSettings = async (settings: NotificationSettings) => {
    if (!currentUserId) {
      setStaffProfileError('Please sign in to update notification settings.');
      return;
    }

    const role: StaffRole = isAdmin ? 'admin' : 'agent';
    setStaffProfileDraft(prev => ({
      ...prev,
      notificationSettings: settings,
    }));
    setStaffProfileError('');

    try {
      await saveStaffNotificationSettings({
        currentUserEmail,
        currentUserId,
        isAdmin,
        settings,
        staffProfileDraft: {
          ...staffProfileDraft,
          notificationSettings: settings,
        },
      });
    } catch (error) {
      console.error('Failed to save staff notification settings', error);
      setStaffProfileError('Unable to save notification settings right now.');
    }
  };

  return {
    isProfileOpen,
    profileDraft,
    isProfileAddressExpanded,
    profileError,
    isProfileSaving,
    isProfileSavedToastVisible,
    isStaffProfileOpen,
    staffProfileDraft,
    staffProfileError,
    isStaffProfileSaving,
    isStaffProfileSavedToastVisible,
    handleOpenProfile,
    handleOpenStaffProfile,
    handleSaveProfile,
    handleSaveStaffProfile,
    handleSaveProfileNotificationSettings,
    handleSaveStaffNotificationSettings,
    setIsProfileOpen,
    setProfileDraft,
    setIsProfileAddressExpanded,
    setIsStaffProfileOpen,
    setStaffProfileDraft,
  };
};
