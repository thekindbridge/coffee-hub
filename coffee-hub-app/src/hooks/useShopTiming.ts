import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getShopTimingRequest } from '../services/api/shopTimingService';
import { toAppServiceError } from '../services/serviceError';
import {
  EMPTY_SHOP_TIMING,
  buildOpensInMessage,
  getCurrentTimeInMinutes,
  isShopOpen,
  type ShopTiming,
} from '../shared/shopTiming';

const SHOP_TIMING_REFRESH_INTERVAL_MS = 15000;

export const useShopTiming = () => {
  const [shopTiming, setShopTiming] = useState<ShopTiming | null>(null);
  const [currentTime, setCurrentTime] = useState(() => getCurrentTimeInMinutes());
  const [isLoading, setIsLoading] = useState(true);
  const latestShopTimingRef = useRef<ShopTiming | null>(null);

  useEffect(() => {
    latestShopTimingRef.current = shopTiming;
  }, [shopTiming]);

  const refreshShopTiming = useCallback(async (options?: { suppressLoading?: boolean }) => {
    if (!options?.suppressLoading && latestShopTimingRef.current == null) {
      setIsLoading(true);
    }

    try {
      const response = await getShopTimingRequest();
      const nextShopTiming: ShopTiming = {
        closeTime: response.closeTime,
        openTime: response.openTime,
        updatedAt: response.updatedAt,
      };
      setShopTiming(nextShopTiming);
      return nextShopTiming;
    } catch (error) {
      const mappedError = toAppServiceError(error, 'Unable to load shop timing.', 'network');
      const hasServerTiming = Boolean(
        latestShopTimingRef.current?.openTime && latestShopTimingRef.current?.closeTime,
      );

      if (!hasServerTiming) {
        console.error('Failed to load shop timing from backend. No previous timing is available.', mappedError);
        setShopTiming(EMPTY_SHOP_TIMING);
      } else {
        console.error('Failed to refresh shop timing from backend. Keeping the last known server value.', mappedError);
      }
      throw mappedError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshShopTiming().catch(error => {
      console.error('Failed to load shop timing', error);
    });
  }, [refreshShopTiming]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(getCurrentTimeInMinutes());
      void refreshShopTiming({ suppressLoading: true }).catch(error => {
        console.error('Failed to refresh shop timing', error);
      });
    }, SHOP_TIMING_REFRESH_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        return;
      }

      setCurrentTime(getCurrentTimeInMinutes());
      void refreshShopTiming({ suppressLoading: true }).catch(error => {
        console.error('Failed to refresh shop timing after app resume', error);
      });
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [refreshShopTiming]);

  const resolvedShopTiming = shopTiming ?? EMPTY_SHOP_TIMING;
  const isOpen = useMemo(
    () => isShopOpen(resolvedShopTiming.openTime, resolvedShopTiming.closeTime, currentTime),
    [currentTime, resolvedShopTiming.closeTime, resolvedShopTiming.openTime],
  );

  return {
    ...resolvedShopTiming,
    currentTime,
    isLoading,
    isOpen,
    refreshShopTiming,
    shopTiming: resolvedShopTiming,
    shopCountdownMessage: isOpen ? '' : buildOpensInMessage(resolvedShopTiming.openTime, currentTime),
  };
};
