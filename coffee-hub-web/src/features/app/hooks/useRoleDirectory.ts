import { useEffect, useMemo, useState } from 'react';
import { subscribeToRoleAssignments } from '../../../services/roleService';
import type { AccessEntry } from '../types';

export type RoleDirectoryData = {
  userRoleEntries: AccessEntry[];
  adminRoleEntries: AccessEntry[];
  deliveryAgentRoleEntries: AccessEntry[];
};

/**
 * Loads live role assignments from user_roles/{phone} for the owner-only
 * management panel. The active signed-in user's role is resolved separately
 * through useUserRole.
 */
export const useRoleDirectory = (isOwner: boolean): RoleDirectoryData => {
  const [userRoleEntries, setUserRoleEntries] = useState<AccessEntry[]>([]);

  useEffect(() => {
    if (!isOwner) {
      setUserRoleEntries([]);
      return;
    }

    return subscribeToRoleAssignments(
      setUserRoleEntries,
      error => {
        console.error('Failed to load role assignments', error);
        setUserRoleEntries([]);
      },
    );
  }, [isOwner]);

  const adminRoleEntries = useMemo(
    () => userRoleEntries.filter(entry => entry.role === 'admin'),
    [userRoleEntries],
  );
  const deliveryAgentRoleEntries = useMemo(
    () => userRoleEntries.filter(entry => entry.role === 'delivery_agent'),
    [userRoleEntries],
  );

  return {
    userRoleEntries,
    adminRoleEntries,
    deliveryAgentRoleEntries,
  };
};
