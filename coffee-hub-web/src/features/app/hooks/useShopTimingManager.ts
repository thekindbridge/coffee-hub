import { useEffect, useState } from 'react';
import {
  updateDeliveryChargeRequest,
  updateShopTimingRequest,
} from '../../../services/api/shopService';
import { getCurrentUserIdToken } from '../../../services/auth/authService';
import type { ShopTimingDraft } from '../types';
import {
  getSafeDeliveryCharge,
  parseDeliveryCharge,
  validateDeliveryCharge,
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
  deliveryChargeDraft: string;
  deliveryChargeError: string;
  deliveryChargeSuccess: string;
  isDeliveryChargeSaving: boolean;
  handleShopTimingDraftChange: (draft: ShopTimingDraft) => void;
  handleSaveShopTiming: () => Promise<void>;
  handleDeliveryChargeDraftChange: (value: string) => void;
  handleSaveDeliveryCharge: () => Promise<void>;
};

const buildDraft = (shopTiming: ShopTiming): ShopTimingDraft => ({
  openTime: shopTiming.openTime,
  closeTime: shopTiming.closeTime,
});

const buildDeliveryChargeDraft = (shopTiming: ShopTiming) => {
  const normalizedCharge = getSafeDeliveryCharge(shopTiming.deliveryCharge);
  return Number.isInteger(normalizedCharge)
    ? `${normalizedCharge}`
    : normalizedCharge.toFixed(2);
};

export const useShopTimingManager = ({
  isAdmin,
  isDrawerOpen,
  shopTiming,
}: UseShopTimingManagerParams): ShopTimingManagerState => {
  const [shopTimingDraft, setShopTimingDraft] = useState<ShopTimingDraft>(buildDraft(shopTiming));
  const [shopTimingError, setShopTimingError] = useState('');
  const [shopTimingSuccess, setShopTimingSuccess] = useState('');
  const [isShopTimingSaving, setIsShopTimingSaving] = useState(false);
  const [deliveryChargeDraft, setDeliveryChargeDraft] = useState(buildDeliveryChargeDraft(shopTiming));
  const [deliveryChargeError, setDeliveryChargeError] = useState('');
  const [deliveryChargeSuccess, setDeliveryChargeSuccess] = useState('');
  const [isDeliveryChargeSaving, setIsDeliveryChargeSaving] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) {
      setShopTimingDraft(buildDraft(shopTiming));
      setShopTimingError('');
      setShopTimingSuccess('');
      setDeliveryChargeDraft(buildDeliveryChargeDraft(shopTiming));
      setDeliveryChargeError('');
      setDeliveryChargeSuccess('');
    }
  }, [isDrawerOpen, shopTiming]);

  useEffect(() => {
    if (!shopTimingSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => setShopTimingSuccess(''), 2500);
    return () => clearTimeout(timeoutId);
  }, [shopTimingSuccess]);

  useEffect(() => {
    if (!deliveryChargeSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => setDeliveryChargeSuccess(''), 2500);
    return () => clearTimeout(timeoutId);
  }, [deliveryChargeSuccess]);

  const handleShopTimingDraftChange = (draft: ShopTimingDraft) => {
    setShopTimingDraft(draft);

    if (shopTimingError) {
      setShopTimingError('');
    }

    if (shopTimingSuccess) {
      setShopTimingSuccess('');
    }
  };

  const handleDeliveryChargeDraftChange = (value: string) => {
    setDeliveryChargeDraft(value);

    if (deliveryChargeError) {
      setDeliveryChargeError('');
    }

    if (deliveryChargeSuccess) {
      setDeliveryChargeSuccess('');
    }
  };

  const handleSaveShopTiming = async () => {
    if (!isAdmin) {
      setShopTimingError('Owner or admin access is required to update shop timing.');
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
      const typedError = error as Error;
      setShopTimingError(typedError.message || 'Unable to update shop timing right now.');
    } finally {
      setIsShopTimingSaving(false);
    }
  };

  const handleSaveDeliveryCharge = async () => {
    if (!isAdmin) {
      setDeliveryChargeError('Owner or admin access is required to update delivery charge.');
      return;
    }

    const trimmedValue = deliveryChargeDraft.trim();
    const validationMessage = validateDeliveryCharge(trimmedValue);

    if (validationMessage) {
      setDeliveryChargeError(validationMessage);
      return;
    }

    const deliveryCharge = parseDeliveryCharge(trimmedValue);
    if (deliveryCharge === null) {
      setDeliveryChargeError('Delivery charge must be a valid non-negative amount.');
      return;
    }

    setIsDeliveryChargeSaving(true);
    setDeliveryChargeError('');
    setDeliveryChargeSuccess('');

    try {
      const idToken = await getCurrentUserIdToken(true);
      if (!idToken) {
        setDeliveryChargeError('Please sign in again before updating delivery charge.');
        return;
      }

      const response = await updateDeliveryChargeRequest({ deliveryCharge }, idToken);

      setDeliveryChargeDraft(buildDeliveryChargeDraft(response.shopTiming));
      setDeliveryChargeSuccess(response.message || 'Delivery charge updated successfully.');
    } catch (error) {
      const typedError = error as Error;
      setDeliveryChargeError(typedError.message || 'Unable to update delivery charge right now.');
    } finally {
      setIsDeliveryChargeSaving(false);
    }
  };

  return {
    shopTimingDraft,
    shopTimingError,
    shopTimingSuccess,
    isShopTimingSaving,
    deliveryChargeDraft,
    deliveryChargeError,
    deliveryChargeSuccess,
    isDeliveryChargeSaving,
    handleShopTimingDraftChange,
    handleSaveShopTiming,
    handleDeliveryChargeDraftChange,
    handleSaveDeliveryCharge,
  };
};
