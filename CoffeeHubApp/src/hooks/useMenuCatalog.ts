import { useEffect, useState } from 'react';

import { getMenu, type MenuItem } from '../services/api';

export function useMenuCatalog() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMenu = async () => {
    setIsLoading(true);

    try {
      const nextMenu = await getMenu();
      setMenuItems(nextMenu);
      setErrorMessage('');
    } catch (error) {
      const nextError =
        error instanceof Error ? error.message : 'Unable to load the menu right now.';
      setErrorMessage(nextError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMenu();
  }, []);

  return {
    errorMessage,
    isLoading,
    menuItems,
    reloadMenu: loadMenu,
  };
}
