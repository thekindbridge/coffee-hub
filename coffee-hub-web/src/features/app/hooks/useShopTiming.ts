import { useCallback, useEffect, useState } from 'react';
import { getShopTimingRequest } from '../../../services/api/shopService';
import {
  EMPTY_SHOP_TIMING,
  type ShopTiming,
} from '../../../../shared/shopTiming';

type ShopTimingData = {
  shopTiming: ShopTiming;
  isShopTimingLoading: boolean;
};

const SHOP_TIMING_REFRESH_INTERVAL_MS = 15000;

export const useShopTiming = (): ShopTimingData => {
  const [shopTiming, setShopTiming] = useState<ShopTiming>(EMPTY_SHOP_TIMING);
  const [isShopTimingLoading, setIsShopTimingLoading] = useState(true);

  const refreshShopTiming = useCallback(async () => {
    try {
      const nextShopTiming = await getShopTimingRequest();
      setShopTiming(nextShopTiming);
    } catch (error) {
      console.error('Failed to load shop timing from backend', error);
      setShopTiming(currentTiming => currentTiming.openTime && currentTiming.closeTime
        ? currentTiming
        : EMPTY_SHOP_TIMING);
    } finally {
      setIsShopTimingLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshShopTiming();

    const intervalId = window.setInterval(() => {
      void refreshShopTiming();
    }, SHOP_TIMING_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshShopTiming();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshShopTiming]);

  return {
    shopTiming,
    isShopTimingLoading,
  };
};
