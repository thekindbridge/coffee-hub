import type { Offer } from '../types';

export interface DiscountCalculationResult {
  discount: number;
  finalTotal: number;
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const calculateDiscount = (subtotal: number, offer: Offer): DiscountCalculationResult => {
  const normalizedSubtotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0;
  const normalizedDiscountValue = Number.isFinite(offer.discountValue) ? Math.max(0, offer.discountValue) : 0;

  let discount = 0;
  if (offer.discountType === 'percentage') {
    const percentage = Math.min(100, normalizedDiscountValue);
    discount = (normalizedSubtotal * percentage) / 100;
  } else {
    discount = normalizedDiscountValue;
  }

  if (typeof offer.maxDiscountAmount === 'number' && Number.isFinite(offer.maxDiscountAmount) && offer.maxDiscountAmount >= 0) {
    discount = Math.min(discount, offer.maxDiscountAmount);
  }

  discount = Math.min(discount, normalizedSubtotal);
  const finalTotal = Math.max(0, normalizedSubtotal - discount);

  return {
    discount: roundCurrency(discount),
    finalTotal: roundCurrency(finalTotal),
  };
};
