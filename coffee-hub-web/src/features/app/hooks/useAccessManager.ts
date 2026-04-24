import { useEffect, useState } from 'react';
import { updateUserRoleEntry } from '../../../services/firebase/userRoleService';
import type { AccessEntry } from '../types';
import { ADMIN_PHONE, AGENT_PHONE } from '../lib/constants';

type UseAccessManagerParams = {
  canManageRoles: boolean;
  currentUserPhone: string;
  userRoleEntries: AccessEntry[];
};

export type AccessManagerState = {
  roleChangeError: string;
  roleChangeSuccess: string;
  updatingUserRoleId: string;
  updatingUserRoleValue: AccessEntry['role'] | '';
  setRoleChangeError: (error: string) => void;
  setRoleChangeSuccess: (message: string) => void;
  handleChangeUserRole: (
    entry: AccessEntry,
    role: AccessEntry['role'],
  ) => Promise<void>;
};

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export const useAccessManager = ({
  canManageRoles,
  currentUserPhone,
  userRoleEntries,
}: UseAccessManagerParams): AccessManagerState => {
  const [roleChangeError, setRoleChangeError] = useState('');
  const [roleChangeSuccess, setRoleChangeSuccess] = useState('');
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState('');
  const [updatingUserRoleValue, setUpdatingUserRoleValue] = useState<AccessEntry['role'] | ''>('');

  useEffect(() => {
    if (!roleChangeSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => setRoleChangeSuccess(''), 2500);
    return () => clearTimeout(timeoutId);
  }, [roleChangeSuccess]);

  const handleChangeUserRole = async (
    entry: AccessEntry,
    role: AccessEntry['role'],
  ) => {
    if (!canManageRoles) {
      setRoleChangeError('Only admins can update user roles.');
      return;
    }

    if (!entry.phone) {
      setRoleChangeError('This user is missing a valid phone number.');
      return;
    }

    if (entry.role === role) {
      return;
    }

    if (entry.phone === ADMIN_PHONE && role !== 'admin') {
      setRoleChangeError('The configured admin phone is locked to the admin role.');
      return;
    }

    if (entry.phone === AGENT_PHONE && role !== 'agent') {
      setRoleChangeError('The configured agent phone is locked to the agent role.');
      return;
    }

    if (
      entry.phone === currentUserPhone &&
      entry.role === 'admin' &&
      role !== 'admin' &&
      userRoleEntries.filter(userEntry => userEntry.role === 'admin').length <= 1
    ) {
      setRoleChangeError('Keep at least one admin account active before demoting this user.');
      return;
    }

    setUpdatingUserRoleId(entry.id);
    setUpdatingUserRoleValue(role);
    setRoleChangeError('');
    setRoleChangeSuccess('');

    try {
      await updateUserRoleEntry(entry.id, entry.phone, role);
      setRoleChangeSuccess('User role updated.');
    } catch (error) {
      console.error('Failed to update user role', error);
      setRoleChangeError(getErrorMessage(error, 'Unable to update the user role right now.'));
    } finally {
      setUpdatingUserRoleId('');
      setUpdatingUserRoleValue('');
    }
  };

  return {
    roleChangeError,
    roleChangeSuccess,
    updatingUserRoleId,
    updatingUserRoleValue,
    setRoleChangeError,
    setRoleChangeSuccess,
    handleChangeUserRole,
  };
};
