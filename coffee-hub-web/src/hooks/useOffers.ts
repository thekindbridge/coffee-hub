import { useCallback, useEffect, useMemo, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Offer, OfferInput } from '../types';

const OFFERS_COLLECTION = 'offers';

const mapOfferDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): Offer => {
  const data = snapshot.data() as Record<string, unknown>;
  const createdAtValue = data.createdAt as Timestamp | undefined;
  const maxDiscountRaw = data.maxDiscountAmount;

  return {
    id: snapshot.id,
    title: (data.title as string) || '',
    description: (data.description as string) || '',
    couponCode: ((data.couponCode as string) || '').toUpperCase(),
    discountType: ((data.discountType as Offer['discountType']) || 'flat'),
    discountValue: Number(data.discountValue || 0),
    minOrderAmount: Number(data.minOrderAmount || 0),
    maxDiscountAmount: typeof maxDiscountRaw === 'number' ? maxDiscountRaw : undefined,
    isActive: data.isActive !== false,
    createdAt: createdAtValue?.toDate()?.toISOString() || new Date().toISOString(),
  };
};

const normalizeCouponCode = (couponCode: string) => couponCode.trim().toUpperCase();

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
    const offersCollection = collection(db, OFFERS_COLLECTION);
    const offersQuery = includeInactive
      ? query(offersCollection)
      : query(offersCollection, where('isActive', '==', true));

    const unsubscribe = onSnapshot(
      offersQuery,
      snapshot => {
        const mappedOffers = snapshot.docs
          .map(mapOfferDoc)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setOffers(mappedOffers);
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

  const assertCouponCodeUnique = useCallback(async (couponCode: string, offerIdToIgnore = '') => {
    const normalizedCouponCode = normalizeCouponCode(couponCode);
    const duplicateSnapshot = await getDocs(
      query(collection(db, OFFERS_COLLECTION), where('couponCode', '==', normalizedCouponCode)),
    );

    const hasDuplicate = duplicateSnapshot.docs.some(offerDoc => offerDoc.id !== offerIdToIgnore);
    if (hasDuplicate) {
      throw new Error('Coupon code already exists.');
    }
  }, []);

  const createOffer = useCallback(async (offerInput: OfferInput) => {
    const normalizedCouponCode = normalizeCouponCode(offerInput.couponCode);
    await assertCouponCodeUnique(normalizedCouponCode);

    const payload: Record<string, unknown> = {
      title: offerInput.title.trim(),
      description: offerInput.description.trim(),
      couponCode: normalizedCouponCode,
      discountType: offerInput.discountType,
      discountValue: offerInput.discountValue,
      minOrderAmount: offerInput.minOrderAmount,
      isActive: offerInput.isActive,
      createdAt: serverTimestamp(),
    };

    if (typeof offerInput.maxDiscountAmount === 'number') {
      payload.maxDiscountAmount = offerInput.maxDiscountAmount;
    }

    await addDoc(collection(db, OFFERS_COLLECTION), payload);
  }, [assertCouponCodeUnique]);

  const updateOffer = useCallback(async (offerId: string, offerInput: OfferInput) => {
    const normalizedCouponCode = normalizeCouponCode(offerInput.couponCode);
    await assertCouponCodeUnique(normalizedCouponCode, offerId);

    await updateDoc(doc(db, OFFERS_COLLECTION, offerId), {
      title: offerInput.title.trim(),
      description: offerInput.description.trim(),
      couponCode: normalizedCouponCode,
      discountType: offerInput.discountType,
      discountValue: offerInput.discountValue,
      minOrderAmount: offerInput.minOrderAmount,
      isActive: offerInput.isActive,
      maxDiscountAmount: typeof offerInput.maxDiscountAmount === 'number'
        ? offerInput.maxDiscountAmount
        : deleteField(),
    });
  }, [assertCouponCodeUnique]);

  const deleteOffer = useCallback(async (offerId: string) => {
    await deleteDoc(doc(db, OFFERS_COLLECTION, offerId));
  }, []);

  const toggleOfferStatus = useCallback(async (offerId: string, isActive: boolean) => {
    await updateDoc(doc(db, OFFERS_COLLECTION, offerId), { isActive });
  }, []);

  const findActiveOfferByCode = useCallback(async (couponCode: string) => {
    const normalizedCouponCode = normalizeCouponCode(couponCode);
    if (!normalizedCouponCode) {
      return null;
    }

    let matchingOfferSnapshot;
    try {
      matchingOfferSnapshot = await getDocs(
        query(
          collection(db, OFFERS_COLLECTION),
          where('couponCode', '==', normalizedCouponCode),
          where('isActive', '==', true),
          limit(1),
        ),
      );
    } catch (error) {
      const shouldFallback = error instanceof FirebaseError && error.code === 'failed-precondition';
      if (!shouldFallback) {
        throw error;
      }

      matchingOfferSnapshot = await getDocs(
        query(
          collection(db, OFFERS_COLLECTION),
          where('couponCode', '==', normalizedCouponCode),
          limit(1),
        ),
      );
    }

    if (matchingOfferSnapshot.empty) {
      return null;
    }

    const matchingOffer = mapOfferDoc(matchingOfferSnapshot.docs[0]);
    return matchingOffer.isActive ? matchingOffer : null;
  }, []);

  const activeOffers = useMemo(
    () => offers.filter(offer => offer.isActive),
    [offers],
  );

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
