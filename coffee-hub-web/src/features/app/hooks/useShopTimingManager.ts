import { useEffect, useState } from 'react';
import { updateShopTimingRequest } from '../../../services/api/shopService';
import { getCurrentUserIdToken } from '../../../services/firebase/authService';
import type { ShopTimingDraft } from '../types';
import {
  validateShopTiming,
  type ShopTiming,
} from '../../../../shared/shopTiming';

type UseShopTimingManagerParams = {
  isAdmin: boolean;
  isDrawerOpen: boolean;
  shopTiming: ShopTiming;
};

export type ShopTimingManagerState = {
  shopTimingDraft: ShopTimingDraft;
  shopTimingError: string;
  shopTimingSuccess: string;
  isShopTimingSaving: boolean;
  handleShopTimingDraftChange: (draft: ShopTimingDraft) => void;
  handleSaveShopTiming: () => Promise<void>;
};

const buildDraft = (shopTiming: ShopTiming): ShopTimingDraft => ({
  openTime: shopTiming.openTime,
  closeTime: shopTiming.closeTime,
});

export const useShopTimingManager = ({
  isAdmin,
  isDrawerOpen,
  shopTiming,
}: UseShopTimingManagerParams): ShopTimingManagerState => {
  const [shopTimingDraft, setShopTimingDraft] = useState<ShopTimingDraft>(buildDraft(shopTiming));
  const [shopTimingError, setShopTimingError] = useState('');
  const [shopTimingSuccess, setShopTimingSuccess] = useState('');
  const [isShopTimingSaving, setIsShopTimingSaving] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) {
      setShopTimingDraft(buildDraft(shopTiming));
      setShopTimingError('');
      setShopTimingSuccess('');
    }
  }, [isDrawerOpen, shopTiming]);

  useEffect(() => {
    if (!shopTimingSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => setShopTimingSuccess(''), 2500);
    return () => clearTimeout(timeoutId);
  }, [shopTimingSuccess]);

  const handleShopTimingDraftChange = (draft: ShopTimingDraft) => {
    setShopTimingDraft(draft);

    if (shopTimingError) {
      setShopTimingError('');
    }

    if (shopTimingSuccess) {
      setShopTimingSuccess('');
    }
  };

  const handleSaveShopTiming = async () => {
    if (!isAdmin) {
      setShopTimingError('Admin access is required to update shop timing.');
      return;
    }

    const openTime = shopTimingDraft.openTime.trim();
    const closeTime = shopTimingDraft.closeTime.trim();
    const validationMessage = validateShopTiming(openTime, closeTime);

    if (validationMessage) {
      setShopTimingError(validationMessage);
      return;
    }

    setIsShopTimingSaving(true);
    setShopTimingError('');
    setShopTimingSuccess('');

    try {
      const idToken = await getCurrentUserIdToken(true);
      if (!idToken) {
        setShopTimingError('Please sign in again before updating shop timing.');
        return;
      }

      const response = await updateShopTimingRequest({ openTime, closeTime }, idToken);

      setShopTimingDraft(buildDraft(response.shopTiming));
      setShopTimingSuccess(response.message || 'Shop timing updated successfully.');
    } catch (error) {
      console.error('Failed to update shop timing', error);
      const typedError = error as Error;
      setShopTimingError(typedError.message || 'Unable to update shop timing right now.');
    } finally {
      setIsShopTimingSaving(false);
    }
  };

  return {
    shopTimingDraft,
    shopTimingError,
    shopTimingSuccess,
    isShopTimingSaving,
    handleShopTimingDraftChange,
    handleSaveShopTiming,
  };
};
