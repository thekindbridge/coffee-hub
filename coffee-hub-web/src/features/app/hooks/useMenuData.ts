import { useEffect, useState } from 'react';
import type { MenuItem } from '../../../types';
import { subscribeToAvailableMenuItems } from '../../../services/firebase/menuService';

export type MenuData = {
  menu: MenuItem[];
  isMenuLoading: boolean;
};

/**
 * Subscribes to the menu_items Firestore collection in real-time.
 * Only fetches when the user is logged in. Filters out unavailable items.
 */
export const useMenuData = (isLoggedIn: boolean): MenuData => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setMenu([]);
      setIsMenuLoading(false);
      return;
    }

    setIsMenuLoading(true);
    const unsubscribe = subscribeToAvailableMenuItems(
      items => {
        setMenu(items);
        setIsMenuLoading(false);
      },
      error => {
        console.error('Failed to subscribe to menu items', error);
        setIsMenuLoading(false);
      },
    );
    return unsubscribe;
  }, [isLoggedIn]);

  return { menu, isMenuLoading };
};
