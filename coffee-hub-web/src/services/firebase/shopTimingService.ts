import { doc, onSnapshot } from 'firebase/firestore';
import {
  DEFAULT_SHOP_TIMING,
  sanitizeShopTiming,
  type ShopTiming,
} from '../../../shared/shopTiming';
import { db } from './index';

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

export const subscribeToShopTiming = (
  onData: (shopTiming: ShopTiming) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'settings', 'shop'),
  snapshot => {
    if (!snapshot.exists()) {
      onData(DEFAULT_SHOP_TIMING);
      return;
    }

    const data = snapshot.data() as Record<string, unknown>;
    onData(
      sanitizeShopTiming({
        openTime: data.openTime,
        closeTime: data.closeTime,
        updatedAt: mapTimestampToIsoString(data.updatedAt),
      }),
    );
  },
  error => {
    onError(error instanceof Error ? error : new Error('Unable to load shop timing.'));
  },
);
