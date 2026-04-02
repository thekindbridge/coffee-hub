import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Offer, OfferInput } from '../../types';
import {
  createOfferRecord,
  deleteOfferRecord,
  findActiveOfferRecordByCode,
  subscribeToOffers,
  toggleOfferRecordStatus,
  updateOfferRecord,
} from '../../services/firebase/offersService';

interface UseOffersOptions {
  includeInactive?: boolean;
}

interface UseOffersResult {
  offers: Offer[];
  activeOffers: Offer[];
  isLoading: boolean;
  error: string;
  createOffer: (offerInput: OfferInput) => Promise<void>;
  updateOffer: (offerId: string, offerInput: OfferInput) => Promise<void>;
  deleteOffer: (offerId: string) => Promise<void>;
  toggleOfferStatus: (offerId: string, isActive: boolean) => Promise<void>;
  findActiveOfferByCode: (couponCode: string) => Promise<Offer | null>;
}

export const useOffers = ({ includeInactive = false }: UseOffersOptions = {}): UseOffersResult => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToOffers(
      includeInactive,
      nextOffers => {
        setOffers(nextOffers);
        setError('');
        setIsLoading(false);
      },
      snapshotError => {
        console.error('Failed to load offers', snapshotError);
        setError('Unable to load offers right now.');
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [includeInactive]);

  const createOffer = useCallback(async (offerInput: OfferInput) => {
    await createOfferRecord(offerInput);
  }, []);

  const updateOffer = useCallback(async (offerId: string, offerInput: OfferInput) => {
    await updateOfferRecord(offerId, offerInput);
  }, []);

  const deleteOffer = useCallback(async (offerId: string) => {
    await deleteOfferRecord(offerId);
  }, []);

  const toggleOfferStatus = useCallback(async (offerId: string, isActive: boolean) => {
    await toggleOfferRecordStatus(offerId, isActive);
  }, []);

  const findActiveOfferByCode = useCallback(async (couponCode: string) => {
    return findActiveOfferRecordByCode(couponCode);
  }, []);

  const activeOffers = useMemo(() => offers.filter(offer => offer.isActive), [offers]);

  return {
    offers,
    activeOffers,
    isLoading,
    error,
    createOffer,
    updateOffer,
    deleteOffer,
    toggleOfferStatus,
    findActiveOfferByCode,
  };
};
