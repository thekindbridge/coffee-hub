import { useEffect, useState } from 'react';
import {
  subscribeToAdminAccessEntries,
  subscribeToAdminAccessStatus,
  subscribeToDeliveryAccessEntries,
  subscribeToDeliveryAccessStatus,
} from '../services/accessService';
import { ADMIN_EMAIL } from '../utils/constants';
import type { AccessEntry, AccessRolesData } from '../types';

/**
 * Verifies the current user's role (admin / delivery agent) using real-time
 * Firestore snapshots. Also loads access-entry lists for the admin panel.
 */
export const useAccessRoles = (
  currentUserEmail: string,
  normalizedCurrentEmail: string,
): AccessRolesData => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeliveryAgent, setIsDeliveryAgent] = useState(false);
  const [adminAccessEntries, setAdminAccessEntries] = useState<AccessEntry[]>([]);
  const [deliveryAccessEntries, setDeliveryAccessEntries] = useState<AccessEntry[]>([]);

  const isMainAdmin = normalizedCurrentEmail === ADMIN_EMAIL;

  // Role verification
  useEffect(() => {
    if (!currentUserEmail) {
      setIsAdmin(false);
      setIsDeliveryAgent(false);
      return;
    }

    const normalizedEmail = currentUserEmail.trim().toLowerCase();

    const unsubscribeAdmin = subscribeToAdminAccessStatus(
      normalizedEmail,
      hasAccess => {
        setIsAdmin(hasAccess || normalizedEmail === ADMIN_EMAIL);
      },
      error => {
        console.error('Failed to verify admin access', error);
        setIsAdmin(normalizedEmail === ADMIN_EMAIL);
      },
    );

    const unsubscribeDelivery = subscribeToDeliveryAccessStatus(
      normalizedEmail,
      setIsDeliveryAgent,
      error => {
        console.error('Failed to verify delivery agent access', error);
        setIsDeliveryAgent(false);
      },
    );

    return () => {
      unsubscribeAdmin();
      unsubscribeDelivery();
    };
  }, [currentUserEmail]);

  // Access entry lists (admin-only)
  useEffect(() => {
    if (!isAdmin) {
      setAdminAccessEntries([]);
      setDeliveryAccessEntries([]);
      return;
    }

    const unsubscribeAdmins = subscribeToAdminAccessEntries(
      setAdminAccessEntries,
      error => {
        console.error('Failed to load admin access list', error);
        setAdminAccessEntries([]);
      },
    );

    const unsubscribeAgents = subscribeToDeliveryAccessEntries(
      setDeliveryAccessEntries,
      error => {
        console.error('Failed to load delivery access list', error);
        setDeliveryAccessEntries([]);
      },
    );

    return () => {
      unsubscribeAdmins();
      unsubscribeAgents();
    };
  }, [isAdmin]);

  return {
    isAdmin,
    isDeliveryAgent,
    isMainAdmin,
    adminAccessEntries,
    deliveryAccessEntries,
  };
};
