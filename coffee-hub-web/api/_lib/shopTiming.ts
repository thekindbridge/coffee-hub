import type { Firestore } from 'firebase-admin/firestore';
import { ApiError } from './errors.js';
import {
  buildShopClosedMessage,
  isShopOpen,
  sanitizeShopTiming,
  type ShopTiming,
} from '../../shared/shopTiming.js';

const SHOP_SETTINGS_COLLECTION = 'settings';
const SHOP_SETTINGS_DOC_ID = 'shop';
const DEFAULT_SHOP_TIMING: ShopTiming = {
  openTime: '09:00',
  closeTime: '22:00',
  deliveryCharge: 0,
  updatedAt: '',
};

const mapTimestampToIsoString = (value: unknown) => {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return '';
};

export const loadShopTiming = async (db: Firestore): Promise<ShopTiming> => {
  const snapshot = await db.collection(SHOP_SETTINGS_COLLECTION).doc(SHOP_SETTINGS_DOC_ID).get();
  if (!snapshot.exists) {
    console.error('API ERROR:', new Error('Shop timing document is missing at settings/shop.'));
    return DEFAULT_SHOP_TIMING;
  }

  const data = snapshot.data() as Record<string, unknown>;
  const shopTiming = sanitizeShopTiming({
    openTime: data.openTime,
    closeTime: data.closeTime,
    deliveryCharge: data.deliveryCharge,
    updatedAt: mapTimestampToIsoString(data.updatedAt),
  });

  if (!shopTiming) {
    console.error('API ERROR:', new Error('Shop timing document is invalid.'), {
      closeTime: data.closeTime,
      openTime: data.openTime,
    });
    return DEFAULT_SHOP_TIMING;
  }

  return shopTiming;
};

export const assertShopIsOpen = async (db: Firestore, currentDate: Date = new Date()) => {
  const shopTiming = await loadShopTiming(db);

  if (!isShopOpen(shopTiming.openTime, shopTiming.closeTime, currentDate)) {
    throw new ApiError(
      400,
      buildShopClosedMessage(shopTiming.openTime, shopTiming.closeTime),
    );
  }

  return shopTiming;
};
