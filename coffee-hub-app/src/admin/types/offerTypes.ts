import type { DiscountType } from '../../types';

export interface Offer {
  id: string;
  title: string;
  description: string;
  couponCode: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface OfferInput {
  title: string;
  description: string;
  couponCode: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isActive: boolean;
}

export interface OfferFormState {
  title: string;
  description: string;
  couponCode: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
}

export const INITIAL_OFFER_FORM: OfferFormState = {
  title: '',
  description: '',
  couponCode: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
};
