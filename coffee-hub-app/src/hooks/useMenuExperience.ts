import { useDeferredValue, useMemo, useState } from 'react';
import { useCartState } from '../app/providers/CartProvider';
import { useMenu } from './useMenu';
import {
  buildMenuClosedMessage,
} from '../shared/shopTiming';

export const useMenuExperience = () => {
  const { menu, isLoading, error, refreshMenu } = useMenu();
  const { isShopOpen, isShopTimingLoading, shopTiming } = useCartState();
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
    () => isShopTimingLoading
      ? 'Checking shop timing...'
      : buildMenuClosedMessage(shopTiming.openTime),
    [isShopTimingLoading, shopTiming.openTime],
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
    isShopOpen,
    isShopTimingLoading,
    refreshMenu,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    shopAvailabilityMessage,
  };
};
