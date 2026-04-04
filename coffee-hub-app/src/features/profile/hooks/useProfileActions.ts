import { useCallback, useState } from 'react';
import { toAppServiceError } from '../../../services/serviceError';
import type {
  AddressLabel,
  CustomerProfile,
  ProfileAddress,
} from '../../../types';
import {
  buildAddressId,
  createEmptyAddress,
  getAvailableAddressLabels,
  sanitizeProfileDraft,
} from '../lib/profileMappers';
import { saveCustomerProfile } from '../services/profileService';
import { useProfileContext } from './ProfileProvider';

export const useProfileActions = () => {
  const {
    currentUserEmail,
    currentUserId,
    dismissCompletionPromptForSession,
    setProfileState,
    suppressCompletionPrompt,
  } = useProfileContext();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const saveProfile = useCallback(async (profileDraft: CustomerProfile) => {
    if (!currentUserId) {
      setSaveError('User not found.');
      return false;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const sanitizedProfile = sanitizeProfileDraft(profileDraft, currentUserEmail);
      await saveCustomerProfile(currentUserId, currentUserEmail, sanitizedProfile);
      setProfileState(sanitizedProfile);
      dismissCompletionPromptForSession();
      return true;
    } catch (error) {
      const typedError = toAppServiceError(
        error,
        'Unable to save your profile right now.',
        'network',
      );
      setSaveError(typedError.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    currentUserEmail,
    currentUserId,
    dismissCompletionPromptForSession,
    setProfileState,
  ]);

  const addAddress = useCallback((profileDraft: CustomerProfile) => {
    const nextLabel = getAvailableAddressLabels(profileDraft.addresses)[0];

    if (!nextLabel) {
      return profileDraft;
    }

    const shouldBecomePrimary = profileDraft.addresses.every(
      address => !address.address.trim(),
    );

    return {
      ...profileDraft,
      addresses: [
        ...profileDraft.addresses,
        {
          ...createEmptyAddress(nextLabel),
          isPrimary: shouldBecomePrimary,
        },
      ],
    };
  }, []);

  const updateAddress = useCallback((
    profileDraft: CustomerProfile,
    addressId: string,
    updates: Partial<ProfileAddress>,
  ) => {
    const requestedLabel = updates.label;
    const nextAddresses = profileDraft.addresses.map(address => {
      if (address.id !== addressId) {
        return address;
      }

      let nextLabel: AddressLabel = address.label;
      if (
        requestedLabel
        && requestedLabel !== address.label
        && !profileDraft.addresses.some(entry => (
          entry.id !== addressId && entry.label === requestedLabel
        ))
      ) {
        nextLabel = requestedLabel;
      }

      return {
        ...address,
        ...updates,
        id: buildAddressId(nextLabel),
        label: nextLabel,
      };
    });

    return {
      ...profileDraft,
      addresses: nextAddresses,
    };
  }, []);

  const deleteAddress = useCallback((profileDraft: CustomerProfile, addressId: string) => {
    const nextAddresses = profileDraft.addresses.filter(address => address.id !== addressId);
    const hasPrimary = nextAddresses.some(address => address.isPrimary);

    return {
      ...profileDraft,
      addresses: nextAddresses.map((address, index) => ({
        ...address,
        isPrimary: hasPrimary ? address.isPrimary : index === 0,
      })),
    };
  }, []);

  const setPrimaryAddress = useCallback((profileDraft: CustomerProfile, addressId: string) => ({
    ...profileDraft,
    addresses: profileDraft.addresses.map(address => ({
      ...address,
      isPrimary: address.id === addressId,
    })),
  }), []);

  return {
    addAddress,
    deleteAddress,
    dismissCompletionPromptForSession,
    isSaving,
    saveError,
    saveProfile,
    setPrimaryAddress,
    suppressCompletionPrompt,
    updateAddress,
  };
};
