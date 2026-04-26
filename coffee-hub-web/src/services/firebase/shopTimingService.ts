import { doc, onSnapshot } from 'firebase/firestore';
import {
  EMPTY_SHOP_TIMING,
  sanitizeShopTiming,
  type ShopTiming,
} from '../../../shared/shopTiming';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

const SETTINGS_COLLECTION = 'settings';
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

const mapShopTimingRecord = (value?: Record<string, unknown>): ShopTiming => {
  const shopTiming = sanitizeShopTiming({
    openTime: value?.openTime,
    closeTime: value?.closeTime,
    updatedAt: mapTimestampToIsoString(value?.updatedAt),
  });

  return shopTiming ?? EMPTY_SHOP_TIMING;
};

export const subscribeToShopTiming = (
  onData: (shopTiming: ShopTiming) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, SETTINGS_COLLECTION, SHOP_SETTINGS_DOC_ID),
  snapshot => {
    if (!snapshot.exists()) {
      onData(EMPTY_SHOP_TIMING);
      return;
    }

    onData(mapShopTimingRecord(snapshot.data() as Record<string, unknown>));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load shop timing right now.'));
  },
);
