import { useCallback, useEffect, useState } from 'react';
import type { MenuItem } from '../types';
import { getMenuItems } from '../services/menuService';

export type UseMenuResult = {
  menu: MenuItem[];
  isLoading: boolean;
  error: string;
  refreshMenu: () => Promise<void>;
};

export const useMenu = (): UseMenuResult => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshMenu = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const items = await getMenuItems();
      setMenu(items);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load menu.';
      setMenu([]);
      setError(message);
      console.error('Failed to load menu', loadError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMenu();
  }, [refreshMenu]);

  return {
    menu,
    isLoading,
    error,
    refreshMenu,
  };
};
