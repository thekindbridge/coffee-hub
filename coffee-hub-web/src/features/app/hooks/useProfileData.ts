import { useEffect, useState } from 'react';
import type { CustomerProfile, StaffProfile, StaffRole } from '../types';
import { seedMainAdminAccess } from '../../../services/firebase/accessService';
import {
  subscribeToCustomerProfile,
  subscribeToStaffProfile,
} from '../../../services/firebase/profileService';
import {
  EMPTY_PROFILE,
  EMPTY_STAFF_PROFILE,
} from '../lib/firestoreMappers';

export type ProfileData = {
  profileSaved: CustomerProfile;
  staffProfileSaved: StaffProfile;
};

/**
 * Subscribes to the current user's profile document.
 * Handles both customer and staff profile variants.
 * Seeds the main admin document on first login.
 */
export const useProfileData = (
  currentUserId: string,
  isAdmin: boolean,
  isDeliveryAgent: boolean,
  normalizedCurrentEmail: string,
  adminEmail: string,
): ProfileData => {
  const [profileSaved, setProfileSaved] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [staffProfileSaved, setStaffProfileSaved] = useState<StaffProfile>(EMPTY_STAFF_PROFILE);

  const isMainAdmin = normalizedCurrentEmail === adminEmail;

  // Seed main admin doc on first login
  useEffect(() => {
    if (!isMainAdmin) return;
    void seedMainAdminAccess(adminEmail).catch(error => {
      console.error('Failed to seed main admin access', error);
    });
  }, [isMainAdmin, adminEmail]);

  // Customer profile subscription
  useEffect(() => {
    if (!currentUserId) {
      setProfileSaved(EMPTY_PROFILE);
      return;
    }

    const unsubscribe = subscribeToCustomerProfile(
      currentUserId,
      setProfileSaved,
      error => {
        console.error('Failed to load customer profile', error);
        setProfileSaved(EMPTY_PROFILE);
      },
    );

    return unsubscribe;
  }, [currentUserId]);

  // Staff profile subscription
  useEffect(() => {
    const fallbackRole: StaffRole = isAdmin ? 'admin' : 'agent';
    const canAccess = isAdmin || isDeliveryAgent;

    if (!currentUserId || !canAccess) {
      setStaffProfileSaved({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
      return;
    }

    const unsubscribe = subscribeToStaffProfile(
      currentUserId,
      fallbackRole,
      setStaffProfileSaved,
      error => {
        console.error('Failed to load staff profile', error);
        setStaffProfileSaved({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
      },
    );

    return unsubscribe;
  }, [currentUserId, isAdmin, isDeliveryAgent]);

  return { profileSaved, staffProfileSaved };
};
