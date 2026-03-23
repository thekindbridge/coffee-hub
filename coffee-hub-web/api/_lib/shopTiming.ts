import type { Firestore } from 'firebase-admin/firestore';
import { ApiError } from './errors.js';
import {
  DEFAULT_SHOP_TIMING,
  buildShopClosedMessage,
  getCurrentShopHour,
  isShopOpenAtHour,
  sanitizeShopTiming,
  type ShopTiming,
} from '../../shared/shopTiming.js';

const SHOP_SETTINGS_COLLECTION = 'settings';
const SHOP_SETTINGS_DOC_ID = 'shop';

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
    return { ...DEFAULT_SHOP_TIMING };
  }

  const data = snapshot.data() as Record<string, unknown>;
  return sanitizeShopTiming({
    openTime: data.openTime,
    closeTime: data.closeTime,
    updatedAt: mapTimestampToIsoString(data.updatedAt),
  });
};

export const assertShopIsOpen = async (db: Firestore, currentDate: Date = new Date()) => {
  const shopTiming = await loadShopTiming(db);
  const currentHour = getCurrentShopHour(currentDate);

  if (!isShopOpenAtHour(currentHour, shopTiming.openTime, shopTiming.closeTime)) {
    throw new ApiError(
      400,
      buildShopClosedMessage(shopTiming.openTime, shopTiming.closeTime),
    );
  }

  return shopTiming;
};
