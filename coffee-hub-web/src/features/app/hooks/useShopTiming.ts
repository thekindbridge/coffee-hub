import { useEffect, useState } from 'react';
import { subscribeToShopTiming } from '../../../services/firebase/shopTimingService';
import {
  DEFAULT_SHOP_TIMING,
  type ShopTiming,
} from '../../../../shared/shopTiming';

type ShopTimingData = {
  shopTiming: ShopTiming;
  isShopTimingLoading: boolean;
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

    const unsubscribe = subscribeToShopTiming(
      nextShopTiming => {
        setShopTiming(nextShopTiming);
        setIsShopTimingLoading(false);
      },
      error => {
        console.error('Failed to load shop timing', error);
        setShopTiming(DEFAULT_SHOP_TIMING);
        setIsShopTimingLoading(false);
      },
    );
    return unsubscribe;
  }, [isLoggedIn]);

  return {
    shopTiming,
    isShopTimingLoading,
  };
};
