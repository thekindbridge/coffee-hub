import type { Firestore } from 'firebase-admin/firestore';
import type { CheckoutOrderDraft, CheckoutOrderItemPayload } from '../../src/types';
import { ApiError } from './errors';

export const DELIVERY_CHARGE = 50;

type DiscountType = 'percentage' | 'flat';

interface OfferRecord {
  couponCode: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isActive: boolean;
}

export interface SanitizedOrderDraft {
  orderId: string;
  customer: CheckoutOrderDraft['customer'];
  items: CheckoutOrderItemPayload[];
  couponCode: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  finalTotal: number;
}

export interface ValidatedPricing {
  items: CheckoutOrderItemPayload[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  finalTotal: number;
  couponCode: string;
}

const ensureString = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return value.trim();
};

const ensureNonNegativeMoney = (value: unknown, fieldName: string) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new ApiError(400, `${fieldName} must be a valid amount.`);
  }

  return Number(numericValue.toFixed(2));
};

const ensurePositiveInteger = (value: unknown, fieldName: string) => {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new ApiError(400, `${fieldName} must be a positive integer.`);
  }

  return numericValue;
};

const normalizeCouponCode = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
};

const parseItem = (value: unknown): CheckoutOrderItemPayload => {
  if (!value || typeof value !== 'object') {
    throw new ApiError(400, 'Order item payload is invalid.');
  }

  const item = value as Record<string, unknown>;
  return {
    id: ensureString(item.id, 'Order item id'),
    name: typeof item.name === 'string' ? item.name.trim() : 'Item',
    quantity: ensurePositiveInteger(item.quantity, 'Order item quantity'),
    price: ensureNonNegativeMoney(item.price, 'Order item price'),
  };
};

export const parseOrderDraft = (value: unknown): SanitizedOrderDraft => {
  if (!value || typeof value !== 'object') {
    throw new ApiError(400, 'Order payload is invalid.');
  }

  const payload = value as Record<string, unknown>;
  const customerValue = payload.customer;
  if (!customerValue || typeof customerValue !== 'object') {
    throw new ApiError(400, 'Customer details are required.');
  }

  const customer = customerValue as Record<string, unknown>;
  const itemsValue = Array.isArray(payload.items) ? payload.items : [];
  if (itemsValue.length === 0) {
    throw new ApiError(400, 'Your cart is empty.');
  }

  return {
    orderId: ensureString(payload.orderId, 'Order ID').toUpperCase(),
    customer: {
      name: ensureString(customer.name, 'Customer name'),
      phone: ensureString(customer.phone, 'Phone number'),
      address: ensureString(customer.address, 'Delivery address'),
    },
    items: itemsValue.map(parseItem),
    couponCode: normalizeCouponCode(payload.couponCode),
    subtotal: ensureNonNegativeMoney(payload.subtotal, 'Subtotal'),
    discount: ensureNonNegativeMoney(payload.discount, 'Discount'),
    deliveryFee: ensureNonNegativeMoney(payload.deliveryFee, 'Delivery fee'),
    finalTotal: ensureNonNegativeMoney(payload.finalTotal, 'Final total'),
  };
};

const calculateDiscount = (subtotal: number, offer: OfferRecord) => {
  const normalizedDiscountValue = Number.isFinite(offer.discountValue) ? Math.max(0, offer.discountValue) : 0;
  let discount = 0;

  if (offer.discountType === 'percentage') {
    discount = Number(((subtotal * normalizedDiscountValue) / 100).toFixed(2));
  } else {
    discount = Number(normalizedDiscountValue.toFixed(2));
  }

  if (typeof offer.maxDiscountAmount === 'number' && Number.isFinite(offer.maxDiscountAmount) && offer.maxDiscountAmount >= 0) {
    discount = Math.min(discount, offer.maxDiscountAmount);
  }

  return Number(Math.min(discount, subtotal).toFixed(2));
};

const isMoneyEqual = (left: number, right: number) => Math.round(left * 100) === Math.round(right * 100);

export const recalculatePricing = async (
  db: Firestore,
  orderDraft: SanitizedOrderDraft,
): Promise<ValidatedPricing> => {
  const uniqueItemIds = Array.from(new Set(orderDraft.items.map(item => item.id)));
  const menuRefs = uniqueItemIds.map(itemId => db.collection('menu_items').doc(itemId));
  const menuSnapshots = await db.getAll(...menuRefs);

  const menuItemMap = new Map<string, { name: string; price: number; isAvailable: boolean }>();
  menuSnapshots.forEach(snapshot => {
    if (!snapshot.exists) {
      return;
    }

    const data = snapshot.data() as Record<string, unknown>;
    menuItemMap.set(snapshot.id, {
      name: (data.name as string) || 'Item',
      price: ensureNonNegativeMoney(data.price, `Menu price for ${snapshot.id}`),
      isAvailable: data.isAvailable !== false,
    });
  });

  const validatedItems = orderDraft.items.map(item => {
    const menuItem = menuItemMap.get(item.id);
    if (!menuItem) {
      throw new ApiError(409, 'One or more menu items are no longer available.');
    }

    if (!menuItem.isAvailable) {
      throw new ApiError(409, `${menuItem.name} is currently unavailable.`);
    }

    return {
      id: item.id,
      name: menuItem.name,
      quantity: item.quantity,
      price: menuItem.price,
    };
  });

  const subtotal = Number(validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2));
  let couponCode = '';
  let discount = 0;

  if (orderDraft.couponCode) {
    const couponSnapshot = await db
      .collection('offers')
      .where('couponCode', '==', orderDraft.couponCode)
      .limit(1)
      .get();

    if (couponSnapshot.empty) {
      throw new ApiError(409, 'Coupon is invalid or has expired.');
    }

    const couponData = couponSnapshot.docs[0].data() as OfferRecord;
    if (!couponData.isActive) {
      throw new ApiError(409, 'Coupon is currently inactive.');
    }

    if (subtotal < Number(couponData.minOrderAmount || 0)) {
      throw new ApiError(409, `Coupon requires a minimum order of ₹${couponData.minOrderAmount}.`);
    }

    discount = calculateDiscount(subtotal, couponData);
    couponCode = orderDraft.couponCode;
  }

  return {
    items: validatedItems,
    subtotal,
    discount,
    deliveryFee: DELIVERY_CHARGE,
    finalTotal: Number((subtotal - discount + DELIVERY_CHARGE).toFixed(2)),
    couponCode,
  };
};

export const assertPricingMatches = (orderDraft: SanitizedOrderDraft, pricing: ValidatedPricing) => {
  const matches =
    isMoneyEqual(orderDraft.subtotal, pricing.subtotal) &&
    isMoneyEqual(orderDraft.discount, pricing.discount) &&
    isMoneyEqual(orderDraft.deliveryFee, pricing.deliveryFee) &&
    isMoneyEqual(orderDraft.finalTotal, pricing.finalTotal);

  if (!matches) {
    throw new ApiError(409, 'Order total mismatch. Please review your cart and try again.');
  }
};

export const parseCreateOrderBody = (body: unknown) => {
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  return {
    userId: ensureString(payload.userId, 'User ID'),
    orderDraft: parseOrderDraft(payload.orderDraft),
  };
};

export const parseVerifyPaymentBody = (body: unknown) => {
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Verification payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  return {
    razorpayOrderId: ensureString(payload.razorpay_order_id, 'Razorpay order ID'),
    razorpayPaymentId: ensureString(payload.razorpay_payment_id, 'Razorpay payment ID'),
    razorpaySignature: ensureString(payload.razorpay_signature, 'Razorpay signature'),
  };
};
