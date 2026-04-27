import type { MenuItem } from '../../types';

export type MenuPageProps = {
  cartQuantityById: Map<string, number>;
  categories: string[];
  filteredMenu: MenuItem[];
  hasStatusBanner: boolean;
  isMenuLoading: boolean;
  isShopOpen: boolean;
  menuError: string;
  onAddToCart: (item: MenuItem, delta: number) => void;
  onCategoryChange: (category: string) => void;
  onOpenCart: () => void;
  onRemoveFromCart: (itemId: string) => void;
  onRetryMenu: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedCategory: string;
  shopAvailabilityMessage: string;
};
