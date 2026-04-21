import { useEffect, useState } from 'react';
import {
  addAdminAccessEntry,
  addDeliveryAccessEntry,
  removeAdminAccessEntry,
  removeDeliveryAccessEntry,
} from '../../../services/firebase/accessService';
import { normalizePhoneNumber } from '../../../../shared/phone';
import type { AccessEntry } from '../types';

type UseAccessManagerParams = {
  isMainAdmin: boolean;
  adminAccessEntries: AccessEntry[];
  deliveryAccessEntries: AccessEntry[];
};

export type AccessManagerState = {
  adminAccessInput: string;
  deliveryAccessInput: string;
  adminAccessError: string;
  deliveryAccessError: string;
  adminAccessSuccess: string;
  deliveryAccessSuccess: string;
  isAdminAccessSaving: boolean;
  isDeliveryAccessSaving: boolean;
  adminAccessRemovingId: string;
  deliveryAccessRemovingId: string;
  setAdminAccessInput: (value: string) => void;
  setDeliveryAccessInput: (value: string) => void;
  setAdminAccessError: (error: string) => void;
  setDeliveryAccessError: (error: string) => void;
  setAdminAccessSuccess: (msg: string) => void;
  setDeliveryAccessSuccess: (msg: string) => void;
  handleAddAdminAccess: () => Promise<void>;
  handleRemoveAdminAccess: (entry: AccessEntry) => Promise<void>;
  handleAddDeliveryAccess: () => Promise<void>;
  handleRemoveDeliveryAccess: (entry: AccessEntry) => Promise<void>;
};

const normalizePhone = (value: string) => {
  try {
    return normalizePhoneNumber(value);
  } catch {
    return '';
  }
};

const validatePhone = (phone: string): string => {
  if (!phone) return 'Enter a phone number.';
  return normalizePhone(phone) ? '' : 'Enter a valid phone number.';
};
const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

/**
 * Manages admin access and delivery agent access CRUD operations.
 * Handles form input state, validation, Firestore writes, and auto-dismiss toasts.
 * Extracted from App.tsx to keep the root component slim.
 */
export const useAccessManager = ({
  isMainAdmin,
  adminAccessEntries,
  deliveryAccessEntries,
}: UseAccessManagerParams): AccessManagerState => {
  const [adminAccessInput, setAdminAccessInput] = useState('');
  const [deliveryAccessInput, setDeliveryAccessInput] = useState('');
  const [adminAccessError, setAdminAccessError] = useState('');
  const [deliveryAccessError, setDeliveryAccessError] = useState('');
  const [adminAccessSuccess, setAdminAccessSuccess] = useState('');
  const [deliveryAccessSuccess, setDeliveryAccessSuccess] = useState('');
  const [isAdminAccessSaving, setIsAdminAccessSaving] = useState(false);
  const [isDeliveryAccessSaving, setIsDeliveryAccessSaving] = useState(false);
  const [adminAccessRemovingId, setAdminAccessRemovingId] = useState('');
  const [deliveryAccessRemovingId, setDeliveryAccessRemovingId] = useState('');

  // Auto-dismiss success toasts
  useEffect(() => {
    if (!adminAccessSuccess) return;
    const id = setTimeout(() => setAdminAccessSuccess(''), 2500);
    return () => clearTimeout(id);
  }, [adminAccessSuccess]);

  useEffect(() => {
    if (!deliveryAccessSuccess) return;
    const id = setTimeout(() => setDeliveryAccessSuccess(''), 2500);
    return () => clearTimeout(id);
  }, [deliveryAccessSuccess]);

  const handleAddAdminAccess = async () => {
    if (!isMainAdmin) {
      setAdminAccessError('Only the main admin can add new admins.');
      return;
    }
    const normalizedPhone = normalizePhone(adminAccessInput);
    const error = validatePhone(adminAccessInput);
    if (error) { setAdminAccessError(error); return; }
    if (adminAccessEntries.some(entry => entry.phone === normalizedPhone)) {
      setAdminAccessError('This admin already has access.'); return;
    }

    setIsAdminAccessSaving(true);
    setAdminAccessError('');
    setAdminAccessSuccess('');
    try {
      await addAdminAccessEntry(normalizedPhone);
      setAdminAccessInput('');
      setAdminAccessSuccess('Admin access added.');
    } catch (err) {
      console.error('Failed to add admin access', err);
      setAdminAccessError(getErrorMessage(err, 'Unable to add admin right now.'));
    } finally {
      setIsAdminAccessSaving(false);
    }
  };

  const handleRemoveAdminAccess = async (entry: AccessEntry) => {
    if (!isMainAdmin) {
      setAdminAccessError('Only the main admin can remove admins.'); return;
    }
    setAdminAccessRemovingId(entry.id);
    setAdminAccessError('');
    setAdminAccessSuccess('');
    try {
      await removeAdminAccessEntry(entry.id);
      setAdminAccessSuccess('Admin access removed.');
    } catch (err) {
      console.error('Failed to remove admin access', err);
      setAdminAccessError(getErrorMessage(err, 'Unable to remove admin right now.'));
    } finally {
      setAdminAccessRemovingId('');
    }
  };

  const handleAddDeliveryAccess = async () => {
    if (!isMainAdmin) {
      setDeliveryAccessError('Only the main admin can add delivery agents.'); return;
    }
    const normalizedPhone = normalizePhone(deliveryAccessInput);
    const error = validatePhone(deliveryAccessInput);
    if (error) { setDeliveryAccessError(error); return; }
    if (deliveryAccessEntries.some(entry => entry.phone === normalizedPhone)) {
      setDeliveryAccessError('This delivery agent already has access.'); return;
    }

    setIsDeliveryAccessSaving(true);
    setDeliveryAccessError('');
    setDeliveryAccessSuccess('');
    try {
      await addDeliveryAccessEntry(normalizedPhone);
      setDeliveryAccessInput('');
      setDeliveryAccessSuccess('Delivery agent access added.');
    } catch (err) {
      console.error('Failed to add delivery agent access', err);
      setDeliveryAccessError(getErrorMessage(err, 'Unable to add delivery agent right now.'));
    } finally {
      setIsDeliveryAccessSaving(false);
    }
  };

  const handleRemoveDeliveryAccess = async (entry: AccessEntry) => {
    if (!isMainAdmin) {
      setDeliveryAccessError('Only the main admin can remove delivery agents.'); return;
    }
    setDeliveryAccessRemovingId(entry.id);
    setDeliveryAccessError('');
    setDeliveryAccessSuccess('');
    try {
      await removeDeliveryAccessEntry(entry.id);
      setDeliveryAccessSuccess('Delivery agent access removed.');
    } catch (err) {
      console.error('Failed to remove delivery agent access', err);
      setDeliveryAccessError(getErrorMessage(err, 'Unable to remove delivery agent right now.'));
    } finally {
      setDeliveryAccessRemovingId('');
    }
  };

  return {
    adminAccessInput,
    deliveryAccessInput,
    adminAccessError,
    deliveryAccessError,
    adminAccessSuccess,
    deliveryAccessSuccess,
    isAdminAccessSaving,
    isDeliveryAccessSaving,
    adminAccessRemovingId,
    deliveryAccessRemovingId,
    setAdminAccessInput,
    setDeliveryAccessInput,
    setAdminAccessError,
    setDeliveryAccessError,
    setAdminAccessSuccess,
    setDeliveryAccessSuccess,
    handleAddAdminAccess,
    handleRemoveAdminAccess,
    handleAddDeliveryAccess,
    handleRemoveDeliveryAccess,
  };
};
