import { useEffect, useState } from 'react';
import {
  subscribeToAdminRoleEntries,
  subscribeToAgentRoleEntries,
  subscribeToUserRoleEntries,
} from '../../../services/firebase/userRoleService';
import type { AccessEntry } from '../types';

export type RoleDirectoryData = {
  userRoleEntries: AccessEntry[];
  adminRoleEntries: AccessEntry[];
  agentRoleEntries: AccessEntry[];
};

/**
 * Loads role-management lists for the admin profile panel.
 * The current user's active role is read from users/{uid}.role in useProfileData.
 */
export const useRoleDirectory = (isAdmin: boolean): RoleDirectoryData => {
  const [userRoleEntries, setUserRoleEntries] = useState<AccessEntry[]>([]);
  const [adminRoleEntries, setAdminRoleEntries] = useState<AccessEntry[]>([]);
  const [agentRoleEntries, setAgentRoleEntries] = useState<AccessEntry[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      setUserRoleEntries([]);
      setAdminRoleEntries([]);
      setAgentRoleEntries([]);
      return;
    }

    const unsubscribeUsers = subscribeToUserRoleEntries(
      setUserRoleEntries,
      error => {
        console.error('Failed to load user role list', error);
        setUserRoleEntries([]);
      },
    );

    const unsubscribeAdmins = subscribeToAdminRoleEntries(
      setAdminRoleEntries,
      error => {
        console.error('Failed to load admin role list', error);
        setAdminRoleEntries([]);
      },
    );

    const unsubscribeAgents = subscribeToAgentRoleEntries(
      setAgentRoleEntries,
      error => {
        console.error('Failed to load delivery agent role list', error);
        setAgentRoleEntries([]);
      },
    );

    return () => {
      unsubscribeUsers();
      unsubscribeAdmins();
      unsubscribeAgents();
    };
  }, [isAdmin]);

  return {
    userRoleEntries,
    adminRoleEntries,
    agentRoleEntries,
  };
};
