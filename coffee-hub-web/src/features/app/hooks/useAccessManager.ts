import { useEffect, useState } from 'react';
import type { AccessEntry, ManagedUserRole } from '../types';
import {
  assignUserRole,
  removeUserRole,
} from '../../../services/roleService';

type UseAccessManagerParams = {
  canManageRoles: boolean;
};

export type AccessManagerState = {
  roleChangeError: string;
  roleChangeSuccess: string;
  pendingRoleAction: 'assign' | 'remove' | '';
  pendingRolePhone: string;
  pendingRoleValue: ManagedUserRole | '';
  setRoleChangeError: (error: string) => void;
  setRoleChangeSuccess: (message: string) => void;
  handleAssignUserRole: (
    phone: string,
    role: ManagedUserRole,
  ) => Promise<void>;
  handleRemoveUserRole: (entry: AccessEntry) => Promise<void>;
};

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export const useAccessManager = ({
  canManageRoles,
}: UseAccessManagerParams): AccessManagerState => {
  const [roleChangeError, setRoleChangeError] = useState('');
  const [roleChangeSuccess, setRoleChangeSuccess] = useState('');
  const [pendingRoleAction, setPendingRoleAction] = useState<'assign' | 'remove' | ''>('');
  const [pendingRolePhone, setPendingRolePhone] = useState('');
  const [pendingRoleValue, setPendingRoleValue] = useState<ManagedUserRole | ''>('');

  useEffect(() => {
    if (!roleChangeSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => setRoleChangeSuccess(''), 2500);
    return () => clearTimeout(timeoutId);
  }, [roleChangeSuccess]);

  const handleAssignUserRole = async (
    phone: string,
    role: ManagedUserRole,
  ) => {
    if (!canManageRoles) {
      setRoleChangeError('Only the owner can manage user roles.');
      return;
    }

    setPendingRoleAction('assign');
    setPendingRolePhone(phone);
    setPendingRoleValue(role);
    setRoleChangeError('');
    setRoleChangeSuccess('');

    try {
      await assignUserRole(phone, role);
      setRoleChangeSuccess('Role assignment saved.');
    } catch (error) {
      console.error('Failed to assign user role', error);
      setRoleChangeError(getErrorMessage(error, 'Unable to save the role assignment right now.'));
    } finally {
      setPendingRoleAction('');
      setPendingRolePhone('');
      setPendingRoleValue('');
    }
  };

  const handleRemoveUserRole = async (entry: AccessEntry) => {
    if (!canManageRoles) {
      setRoleChangeError('Only the owner can manage user roles.');
      return;
    }

    if (!entry.phone) {
      setRoleChangeError('This role assignment is missing a valid phone number.');
      return;
    }

    setPendingRoleAction('remove');
    setPendingRolePhone(entry.phone);
    setPendingRoleValue('');
    setRoleChangeError('');
    setRoleChangeSuccess('');

    try {
      await removeUserRole(entry.phone);
      setRoleChangeSuccess('Role assignment removed.');
    } catch (error) {
      console.error('Failed to remove user role', error);
      setRoleChangeError(getErrorMessage(error, 'Unable to remove the role assignment right now.'));
    } finally {
      setPendingRoleAction('');
      setPendingRolePhone('');
      setPendingRoleValue('');
    }
  };

  return {
    roleChangeError,
    roleChangeSuccess,
    pendingRoleAction,
    pendingRolePhone,
    pendingRoleValue,
    setRoleChangeError,
    setRoleChangeSuccess,
    handleAssignUserRole,
    handleRemoveUserRole,
  };
};
