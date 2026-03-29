import type { MenuItem, Offer } from '../../types';

export type HomePageProps = {
  activeOffers: Offer[];
  cartQuantityById: Map<string, number>;
  hasStatusBanner: boolean;
  isMenuLoading: boolean;
  isShopOpen: boolean;
  menu: MenuItem[];
  onAddToCart: (item: MenuItem, delta: number) => void;
  onOpenMenu: () => void;
  onOpenOffers: () => void;
  shopAvailabilityMessage: string;
};
