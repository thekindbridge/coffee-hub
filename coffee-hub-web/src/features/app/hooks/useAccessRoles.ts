import { useEffect, useState } from 'react';
import {
  subscribeToAdminAccessEntries,
  subscribeToDeliveryAccessEntries,
} from '../../../services/firebase/accessService';
import type { AccessEntry } from '../types';

export type AccessRolesData = {
  adminAccessEntries: AccessEntry[];
  deliveryAccessEntries: AccessEntry[];
};

/**
 * Loads role-management lists for the admin profile panel.
 * The current user's active role is read from users/{uid}.role in useProfileData.
 */
export const useAccessRoles = (isAdmin: boolean): AccessRolesData => {
  const [adminAccessEntries, setAdminAccessEntries] = useState<AccessEntry[]>([]);
  const [deliveryAccessEntries, setDeliveryAccessEntries] = useState<AccessEntry[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminAccessEntries([]);
      setDeliveryAccessEntries([]);
      return;
    }

    const unsubscribeAdmins = subscribeToAdminAccessEntries(
      setAdminAccessEntries,
      error => {
        console.error('Failed to load admin role list', error);
        setAdminAccessEntries([]);
      },
    );

    const unsubscribeAgents = subscribeToDeliveryAccessEntries(
      setDeliveryAccessEntries,
      error => {
        console.error('Failed to load delivery agent role list', error);
        setDeliveryAccessEntries([]);
      },
    );

    return () => {
      unsubscribeAdmins();
      unsubscribeAgents();
    };
  }, [isAdmin]);

  return {
    adminAccessEntries,
    deliveryAccessEntries,
  };
};
