import type { Firestore } from 'firebase-admin/firestore';
import { ApiError } from './errors.js';
import {
  DEFAULT_SHOP_TIMING,
  SHOP_TIMEZONE,
  buildShopClosedMessage,
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

export const getCurrentIstHour = (currentDate: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    hour12: false,
    hourCycle: 'h23',
    timeZone: SHOP_TIMEZONE,
  });
  const hourPart = formatter
    .formatToParts(currentDate)
    .find(part => part.type === 'hour')
    ?.value;
  const hour = Number(hourPart);

  return Number.isInteger(hour) ? hour : currentDate.getUTCHours();
};

export const assertShopIsOpen = async (db: Firestore, currentDate: Date = new Date()) => {
  const shopTiming = await loadShopTiming(db);
  const currentHour = getCurrentIstHour(currentDate);

  if (!isShopOpenAtHour(currentHour, shopTiming.openTime, shopTiming.closeTime)) {
    throw new ApiError(
      400,
      buildShopClosedMessage(shopTiming.openTime, shopTiming.closeTime),
    );
  }

  return shopTiming;
};
