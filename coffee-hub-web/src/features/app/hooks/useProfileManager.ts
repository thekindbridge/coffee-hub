import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
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
  ensureProfileAddresses,
  formatPhoneWithPrefix,
} from '../lib/firestoreMappers';
import type { DeliveryAgent } from '../../../types';

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
    const id = window.setTimeout(() => setIsProfileSavedToastVisible(false), 1800);
    return () => window.clearTimeout(id);
  }, [isProfileSavedToastVisible]);

  // Lock body scroll while staff profile drawer is open
  useEffect(() => {
    document.body.style.overflow = isStaffProfileOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
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
      const trimmedAddresses = ensureProfileAddresses(profileDraft.addresses).map(a => a.trim());
      await setDoc(
        doc(db, 'users', currentUserId),
        {
          name: profileDraft.name.trim(),
          phone: formatPhoneWithPrefix(profileDraft.phone),
          email: profileDraft.email.trim(),
          notificationSettings: profileDraft.notificationSettings,
          addresses: {
            address1: trimmedAddresses[0] || '',
            address2: trimmedAddresses[1] || '',
            address3: trimmedAddresses[2] || '',
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
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
      await setDoc(
        doc(db, 'users', currentUserId),
        {
          notificationSettings: settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
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
    const role: StaffRole = isAdmin ? 'admin' : 'agent';
    setIsStaffProfileSaving(true);
    setStaffProfileError('');
    try {
      const payload: Record<string, unknown> = {
        role,
        name: staffProfileDraft.name.trim(),
        phone: formatPhoneWithPrefix(staffProfileDraft.phone),
        email: staffProfileDraft.email.trim(),
        notificationSettings: staffProfileDraft.notificationSettings,
        updatedAt: serverTimestamp(),
      };

      if (role === 'admin') {
        payload.adminLocation = staffProfileDraft.adminLocation.trim();
      }
      if (role === 'agent') {
        payload.vehicleType = staffProfileDraft.vehicleType;
        payload.status = staffProfileDraft.status;
      }

      await setDoc(doc(db, 'users', currentUserId), payload, { merge: true });

      if (role === 'agent') {
        const normalizedEmail = (staffProfileDraft.email || currentUserEmail || '')
          .trim()
          .toLowerCase();
        if (!normalizedEmail) throw new Error('Agent email is required');

        const existingAgent = deliveryAgents.find(
          agent => agent.id === normalizedEmail || agent.email?.toLowerCase() === normalizedEmail,
        );
        const shouldMarkOffline = staffProfileDraft.status === 'Offline';
        const shouldPreserveBusyAssignment =
          existingAgent?.status === 'busy' && Boolean(existingAgent.current_order_id);
        const agentStatus = shouldMarkOffline
          ? 'BUSY'
          : shouldPreserveBusyAssignment
            ? 'BUSY'
            : 'AVAILABLE';
        const agentPayload: Record<string, unknown> = {
          name: staffProfileDraft.name.trim(),
          phone: formatPhoneWithPrefix(staffProfileDraft.phone),
          email: normalizedEmail,
          notificationSettings: staffProfileDraft.notificationSettings,
          vehicle: staffProfileDraft.vehicleType,
          status: agentStatus,
          isActive: !shouldMarkOffline,
          role: 'delivery',
          accessOnly: false,
          updatedAt: serverTimestamp(),
        };
        if (!existingAgent) agentPayload.createdAt = serverTimestamp();

        await setDoc(doc(db, 'agents', normalizedEmail), agentPayload, { merge: true });
      }

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
      await setDoc(
        doc(db, 'users', currentUserId),
        {
          notificationSettings: settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (role === 'agent') {
        const normalizedEmail = (staffProfileDraft.email || currentUserEmail || '')
          .trim()
          .toLowerCase();

        if (normalizedEmail) {
          await setDoc(
            doc(db, 'agents', normalizedEmail),
            {
              email: normalizedEmail,
              notificationSettings: settings,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      }
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
