import { useCallback, useEffect, useState } from 'react';
import type { MenuItem } from '../../../types';
import { subscribeToAvailableMenuItems } from '../../../services/firebase/menuService';

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
      setIsMenuLoading(false);
      return;
    }

    setIsMenuLoading(true);
    setMenuError('');
    const unsubscribe = subscribeToAvailableMenuItems(
      items => {
        setMenu(items);
        setMenuError('');
        setIsMenuLoading(false);
      },
      error => {
        setMenuError(error.message || 'Something went wrong. Try again');
        setIsMenuLoading(false);
      },
    );
    return unsubscribe;
  }, [enabled, retryToken]);

  return { menu, menuError, retryMenu, isMenuLoading };
};
