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
import type { Offer, OfferInput } from '../../types';
import { toAppServiceError } from '../platform/serviceError';
import {
  getNetworkErrorMessage,
  isNetworkUnavailable,
} from '../platform/networkStatusService';
import { db } from './index';

const OFFERS_COLLECTION = 'offers';
const FALLBACK_TIMESTAMP_ISO = new Date(0).toISOString();

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
    createdAt: createdAtValue?.toDate()?.toISOString() || FALLBACK_TIMESTAMP_ISO,
  };
};

const normalizeCouponCode = (couponCode: string) => couponCode.trim().toUpperCase();

export const subscribeToOffers = (
  includeInactive: boolean,
  onData: (offers: Offer[]) => void,
  onError: (error: Error) => void,
) => {
  const offersCollection = collection(db, OFFERS_COLLECTION);
  const offersQuery = includeInactive
    ? query(offersCollection)
    : query(offersCollection, where('isActive', '==', true));

  return onSnapshot(
    offersQuery,
    snapshot => {
      const mappedOffers = snapshot.docs
        .map(mapOfferDoc)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(mappedOffers);
    },
    error => {
      onError(toAppServiceError(error, 'Unable to load offers.'));
    },
  );
};

export const assertCouponCodeUnique = async (
  couponCode: string,
  offerIdToIgnore = '',
) => {
  if (isNetworkUnavailable()) {
    throw toAppServiceError(getNetworkErrorMessage(), getNetworkErrorMessage(), 'network');
  }

  try {
    const normalizedCouponCode = normalizeCouponCode(couponCode);
    const duplicateSnapshot = await getDocs(
      query(collection(db, OFFERS_COLLECTION), where('couponCode', '==', normalizedCouponCode)),
    );
    const hasDuplicate = duplicateSnapshot.docs.some(document => document.id !== offerIdToIgnore);
    if (hasDuplicate) {
      throw new Error('Coupon code already exists.');
    }
  } catch (error) {
    throw toAppServiceError(error, 'Unable to validate the coupon code.', 'validation');
  }
};

export const createOfferRecord = async (offerInput: OfferInput) => {
  if (isNetworkUnavailable()) {
    throw toAppServiceError(getNetworkErrorMessage(), getNetworkErrorMessage(), 'network');
  }

  try {
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
  } catch (error) {
    throw toAppServiceError(error, 'Unable to create the offer.', 'network');
  }
};

export const updateOfferRecord = async (offerId: string, offerInput: OfferInput) => {
  if (isNetworkUnavailable()) {
    throw toAppServiceError(getNetworkErrorMessage(), getNetworkErrorMessage(), 'network');
  }

  try {
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
  } catch (error) {
    throw toAppServiceError(error, 'Unable to update the offer.', 'network');
  }
};

export const deleteOfferRecord = async (offerId: string) => {
  if (isNetworkUnavailable()) {
    throw toAppServiceError(getNetworkErrorMessage(), getNetworkErrorMessage(), 'network');
  }

  try {
    await deleteDoc(doc(db, OFFERS_COLLECTION, offerId));
  } catch (error) {
    throw toAppServiceError(error, 'Unable to delete the offer.', 'network');
  }
};

export const toggleOfferRecordStatus = async (offerId: string, isActive: boolean) => {
  if (isNetworkUnavailable()) {
    throw toAppServiceError(getNetworkErrorMessage(), getNetworkErrorMessage(), 'network');
  }

  try {
    await updateDoc(doc(db, OFFERS_COLLECTION, offerId), { isActive });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to update offer status.', 'network');
  }
};

export const findActiveOfferRecordByCode = async (couponCode: string) => {
  if (isNetworkUnavailable()) {
    throw toAppServiceError(getNetworkErrorMessage(), getNetworkErrorMessage(), 'network');
  }

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
      throw toAppServiceError(error, 'Unable to load the offer.', 'network');
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
};
