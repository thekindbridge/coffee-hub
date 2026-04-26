import { useCallback, useEffect, useState } from 'react';
import type { MenuItem } from '../../../types';
import { subscribeToAvailableMenuItems } from '../../../services/firebase/menuService';

const MENU_RETRY_DELAY_MS = 1500;
const MAX_AUTO_MENU_RETRIES = 2;

export type MenuData = {
  menu: MenuItem[];
  menuError: string;
  retryMenu: () => void;
  isMenuLoading: boolean;
};

/**
 * Subscribes to the menu_items Firestore collection in real-time.
 * Starts only after the Firebase auth session has resolved. Filters out unavailable items.
 */
export const useMenuData = (enabled: boolean): MenuData => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuError, setMenuError] = useState('');
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);

  const retryMenu = useCallback(() => {
    setRetryToken(token => token + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setMenu([]);
      setMenuError('');
      setIsMenuLoading(false);
      return undefined;
    }

    let activeUnsubscribe: (() => void) | null = null;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;
    let attemptCount = 0;

    const clearRetryTimeout = () => {
      if (retryTimeoutId == null) {
        return;
      }

      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    };

    const subscribe = () => {
      setIsMenuLoading(true);
      setMenuError('');

      activeUnsubscribe = subscribeToAvailableMenuItems(
        items => {
          if (isDisposed) {
            return;
          }

          clearRetryTimeout();
          setMenu(items);
          setMenuError('');
          setIsMenuLoading(false);
        },
        error => {
          if (isDisposed) {
            return;
          }

          activeUnsubscribe?.();
          activeUnsubscribe = null;

          if (attemptCount < MAX_AUTO_MENU_RETRIES) {
            attemptCount += 1;
            retryTimeoutId = setTimeout(() => {
              retryTimeoutId = null;
              subscribe();
            }, MENU_RETRY_DELAY_MS);
            return;
          }

          setMenuError(error.message || 'Something went wrong. Try again');
          setIsMenuLoading(false);
        },
      );
    };

    subscribe();

    return () => {
      isDisposed = true;
      clearRetryTimeout();
      activeUnsubscribe?.();
    };
  }, [enabled, retryToken]);

  return { menu, menuError, retryMenu, isMenuLoading };
};
