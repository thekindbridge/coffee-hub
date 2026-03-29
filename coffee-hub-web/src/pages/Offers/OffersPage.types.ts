import type { Offer } from '../../types';

export type OffersPageProps = {
  activeOffers: Offer[];
  error: string;
  isLoading: boolean;
};
