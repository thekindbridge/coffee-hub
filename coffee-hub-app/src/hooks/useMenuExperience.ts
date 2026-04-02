import { useDeferredValue, useMemo, useState } from 'react';
import { useMenu } from './useMenu';
import {
  DEFAULT_SHOP_TIMING,
  buildShopAvailabilityMessage,
  isShopOpen,
} from '../utils/shopTiming';

export const useMenuExperience = () => {
  const { menu, isLoading, error, refreshMenu } = useMenu();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const categories = useMemo(
    () => ['All', ...new Set(menu.map(item => item.category))],
    [menu],
  );

  const filteredMenu = useMemo(
    () => menu.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(deferredSearchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    }),
    [deferredSearchQuery, menu, selectedCategory],
  );

  const shopAvailabilityMessage = useMemo(
    () => buildShopAvailabilityMessage(DEFAULT_SHOP_TIMING.openTime),
    [],
  );

  const hasActiveFilters = useMemo(
    () => deferredSearchQuery.trim().length > 0 || selectedCategory !== 'All',
    [deferredSearchQuery, selectedCategory],
  );

  return {
    categories,
    error,
    filteredMenu,
    hasActiveFilters,
    hasMenuItems: menu.length > 0,
    isMenuLoading: isLoading,
    isShopOpen: isShopOpen(DEFAULT_SHOP_TIMING.openTime, DEFAULT_SHOP_TIMING.closeTime),
    refreshMenu,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    shopAvailabilityMessage,
  };
};
