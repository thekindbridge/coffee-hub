import { useEffect, useMemo, useState } from 'react';
import type { CartItem, MenuItem, Offer } from '../../../types';
import { calculateDiscount } from '../../../utils/calculateDiscount';
import {
  CURRENCY_SYMBOL,
  STANDARD_DELIVERY_FEE,
} from '../../app/lib/constants';

type UseCartParams = {
  findActiveOfferByCode: (code: string) => Promise<Offer | null>;
};

export type CartState = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  couponInput: string;
  setCouponInput: React.Dispatch<React.SetStateAction<string>>;
  appliedCouponCode: string;
  setAppliedCouponCode: React.Dispatch<React.SetStateAction<string>>;
  appliedOffer: Offer | null;
  setAppliedOffer: React.Dispatch<React.SetStateAction<Offer | null>>;
  couponError: string;
  setCouponError: React.Dispatch<React.SetStateAction<string>>;
  couponSuccess: string;
  setCouponSuccess: React.Dispatch<React.SetStateAction<string>>;
  isApplyingCoupon: boolean;
  isCouponAppliedPulseVisible: boolean;
  hasCartItems: boolean;
  cartTotal: number;
  cartCount: number;
  cartQuantityById: Map<string, number>;
  discountAmount: number;
  deliveryFee: number;
  payableCartTotal: number;
  handleAddToCart: (item: MenuItem, delta: number) => void;
  handleRemoveFromCart: (itemId: string) => void;
  handleApplyCoupon: () => Promise<void>;
  handleRemoveCoupon: () => void;
};

import type React from 'react';

/**
 * Manages cart items, coupon/offer application, and derived totals.
 * Extracted from useCheckoutFlow for single-responsibility.
 */
export const useCart = ({ findActiveOfferByCode }: UseCartParams): CartState => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCouponAppliedPulseVisible, setIsCouponAppliedPulseVisible] = useState(false);

  const hasCartItems = cart.length > 0;
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartQuantityById = useMemo(
    () => new Map(cart.map(item => [item.id, item.quantity])),
    [cart],
  );

  const { discount: discountAmount, finalTotal } = useMemo(() => {
    if (!appliedOffer || cartTotal < appliedOffer.minOrderAmount) {
      return { discount: 0, finalTotal: cartTotal };
    }
    return calculateDiscount(cartTotal, appliedOffer);
  }, [appliedOffer, cartTotal]);

  const deliveryFee = useMemo(() => (hasCartItems ? STANDARD_DELIVERY_FEE : 0), [hasCartItems]);
  const payableCartTotal = useMemo(
    () => Number((finalTotal + deliveryFee).toFixed(2)),
    [deliveryFee, finalTotal],
  );

  // Clear coupon when cart empties
  useEffect(() => {
    if (cart.length > 0) return;
    setAppliedCouponCode('');
    setAppliedOffer(null);
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
  }, [cart.length]);

  // Re-validate applied coupon when cart total changes
  useEffect(() => {
    if (!appliedCouponCode) return;
    void findActiveOfferByCode(appliedCouponCode)
      .then(matchingOffer => {
        if (!matchingOffer) {
          setAppliedCouponCode('');
          setAppliedOffer(null);
          setCouponSuccess('');
          setCouponError('Coupon is no longer active.');
          return;
        }
        setAppliedOffer(matchingOffer);
        if (cartTotal < matchingOffer.minOrderAmount) {
          setAppliedCouponCode('');
          setAppliedOffer(null);
          setCouponSuccess('');
          setCouponError(
            `Coupon removed. Minimum order is ${CURRENCY_SYMBOL}${matchingOffer.minOrderAmount}.`,
          );
        }
      })
      .catch(error => {
        console.error('Failed to validate coupon', error);
      });
  }, [appliedCouponCode, cartTotal, findActiveOfferByCode]);

  // Auto-dismiss coupon pulse animation
  useEffect(() => {
    if (!isCouponAppliedPulseVisible) return;
    const id = window.setTimeout(() => setIsCouponAppliedPulseVisible(false), 650);
    return () => window.clearTimeout(id);
  }, [isCouponAppliedPulseVisible]);

  const handleAddToCart = (item: MenuItem, delta: number) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        const newQuantity = existing.quantity + delta;
        if (newQuantity <= 0) return prev.filter(cartItem => cartItem.id !== item.id);
        return prev.map(cartItem =>
          cartItem.id === item.id ? { ...cartItem, quantity: newQuantity } : cartItem,
        );
      }
      if (delta > 0) return [...prev, { ...item, quantity: 1 }];
      return prev;
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleApplyCoupon = async () => {
    const normalizedCode = couponInput.trim().toUpperCase();
    if (!normalizedCode) {
      setCouponError('Enter a coupon code.');
      setCouponSuccess('');
      return;
    }
    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const matchingOffer = await findActiveOfferByCode(normalizedCode);
      if (!matchingOffer) {
        setAppliedCouponCode('');
        setAppliedOffer(null);
        setCouponError('Invalid coupon code.');
        return;
      }
      if (cartTotal < matchingOffer.minOrderAmount) {
        setAppliedCouponCode('');
        setAppliedOffer(null);
        setCouponError(`Minimum order amount is ${CURRENCY_SYMBOL}${matchingOffer.minOrderAmount}.`);
        return;
      }
      const { discount } = calculateDiscount(cartTotal, matchingOffer);
      if (discount <= 0) {
        setAppliedCouponCode('');
        setAppliedOffer(null);
        setCouponError('Coupon is not applicable for this cart total.');
        return;
      }
      setAppliedCouponCode(matchingOffer.couponCode);
      setAppliedOffer(matchingOffer);
      setCouponInput(matchingOffer.couponCode);
      setCouponSuccess(`Coupon ${matchingOffer.couponCode} applied.`);
      setIsCouponAppliedPulseVisible(true);
    } catch (error) {
      console.error('Failed to apply coupon', error);
      setCouponError('Unable to apply coupon right now.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode('');
    setAppliedOffer(null);
    setCouponError('');
    setCouponSuccess('');
  };

  return {
    cart,
    setCart,
    couponInput,
    setCouponInput,
    appliedCouponCode,
    setAppliedCouponCode,
    appliedOffer,
    setAppliedOffer,
    couponError,
    setCouponError,
    couponSuccess,
    setCouponSuccess,
    isApplyingCoupon,
    isCouponAppliedPulseVisible,
    hasCartItems,
    cartTotal,
    cartCount,
    cartQuantityById,
    discountAmount,
    deliveryFee,
    payableCartTotal,
    handleAddToCart,
    handleRemoveFromCart,
    handleApplyCoupon,
    handleRemoveCoupon,
  };
};
