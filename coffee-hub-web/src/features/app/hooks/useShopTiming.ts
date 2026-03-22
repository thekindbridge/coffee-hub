import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import {
  DEFAULT_SHOP_TIMING,
  sanitizeShopTiming,
  type ShopTiming,
} from '../../../../shared/shopTiming';

type ShopTimingData = {
  shopTiming: ShopTiming;
  isShopTimingLoading: boolean;
};

const mapTimestampToIsoString = (value: unknown) => {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as Timestamp).toDate === 'function'
  ) {
    return (value as Timestamp).toDate().toISOString();
  }

  return '';
};

export const useShopTiming = (isLoggedIn: boolean): ShopTimingData => {
  const [shopTiming, setShopTiming] = useState<ShopTiming>(DEFAULT_SHOP_TIMING);
  const [isShopTimingLoading, setIsShopTimingLoading] = useState(isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) {
      setShopTiming(DEFAULT_SHOP_TIMING);
      setIsShopTimingLoading(false);
      return;
    }

    setIsShopTimingLoading(true);

    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'shop'),
      snapshot => {
        if (!snapshot.exists()) {
          setShopTiming(DEFAULT_SHOP_TIMING);
          setIsShopTimingLoading(false);
          return;
        }

        const data = snapshot.data() as Record<string, unknown>;
        setShopTiming(
          sanitizeShopTiming({
            openTime: data.openTime,
            closeTime: data.closeTime,
            updatedAt: mapTimestampToIsoString(data.updatedAt),
          }),
        );
        setIsShopTimingLoading(false);
      },
      error => {
        console.error('Failed to load shop timing', error);
        setShopTiming(DEFAULT_SHOP_TIMING);
        setIsShopTimingLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isLoggedIn]);

  return {
    shopTiming,
    isShopTimingLoading,
  };
};
