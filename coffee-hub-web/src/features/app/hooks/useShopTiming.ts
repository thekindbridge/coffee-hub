import { useEffect, useState } from 'react';
import { subscribeToShopTiming } from '../../../services/firebase/shopTimingService';
import {
  EMPTY_SHOP_TIMING,
  type ShopTiming,
} from '../../../../shared/shopTiming';

type ShopTimingData = {
  shopTiming: ShopTiming;
  isShopTimingLoading: boolean;
};

export const useShopTiming = (enabled: boolean): ShopTimingData => {
  const [shopTiming, setShopTiming] = useState<ShopTiming>(EMPTY_SHOP_TIMING);
  const [isShopTimingLoading, setIsShopTimingLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setShopTiming(EMPTY_SHOP_TIMING);
      setIsShopTimingLoading(true);
      return undefined;
    }

    return subscribeToShopTiming(
      nextShopTiming => {
        setShopTiming(nextShopTiming);
        setIsShopTimingLoading(false);
      },
      error => {
        console.error('Failed to subscribe to shop timing', error);
        setShopTiming(currentTiming => currentTiming.openTime && currentTiming.closeTime
          ? currentTiming
          : EMPTY_SHOP_TIMING);
        setIsShopTimingLoading(false);
      },
    );
  }, [enabled]);

  return {
    shopTiming,
    isShopTimingLoading,
  };
};
