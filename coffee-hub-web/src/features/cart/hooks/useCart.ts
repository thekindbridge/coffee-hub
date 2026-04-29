import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CartItem, MenuItem, Offer } from '../../../types';
import { calculateDiscount } from '../../../utils/calculateDiscount';
import { CURRENCY_SYMBOL } from '../../app/lib/constants';
import { getSafeDeliveryCharge } from '../../../../shared/shopTiming';

export type UseCartParams = {
  findActiveOfferByCode: (code: string) => Promise<Offer | null>;
  deliveryCharge: number;
};

export type CartState = {
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  couponInput: string;
  setCouponInput: Dispatch<SetStateAction<string>>;
  appliedCouponCode: string;
  setAppliedCouponCode: Dispatch<SetStateAction<string>>;
  appliedOffer: Offer | null;
  setAppliedOffer: Dispatch<SetStateAction<Offer | null>>;
  couponError: string;
  setCouponError: Dispatch<SetStateAction<string>>;
  couponSuccess: string;
  setCouponSuccess: Dispatch<SetStateAction<string>>;
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

export const useCart = ({
  findActiveOfferByCode,
  deliveryCharge,
}: UseCartParams): CartState => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCouponAppliedPulseVisible, setIsCouponAppliedPulseVisible] = useState(false);
  const isApplyingCouponRef = useRef(false);

  const hasCartItems = cart.length > 0;
  const { cartCount, cartTotal } = useMemo(() => (
    cart.reduce(
      (totals, item) => ({
        cartCount: totals.cartCount + item.quantity,
        cartTotal: totals.cartTotal + (item.price * item.quantity),
      }),
      { cartCount: 0, cartTotal: 0 },
    )
  ), [cart]);
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

  const normalizedDeliveryCharge = useMemo(
    () => getSafeDeliveryCharge(deliveryCharge),
    [deliveryCharge],
  );
  const deliveryFee = useMemo(
    () => (hasCartItems ? normalizedDeliveryCharge : 0),
    [hasCartItems, normalizedDeliveryCharge],
  );
  const payableCartTotal = useMemo(
    () => Number((finalTotal + deliveryFee).toFixed(2)),
    [deliveryFee, finalTotal],
  );

  useEffect(() => {
    if (cart.length > 0) {
      return;
    }

    setAppliedCouponCode('');
    setAppliedOffer(null);
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
  }, [cart.length]);

  useEffect(() => {
    if (!appliedCouponCode) {
      return;
    }

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
      .catch(() => {
        setCouponError('Something went wrong. Try again');
      });
  }, [appliedCouponCode, cartTotal, findActiveOfferByCode]);

  useEffect(() => {
    if (!isCouponAppliedPulseVisible) {
      return;
    }

    const timeoutId = setTimeout(() => setIsCouponAppliedPulseVisible(false), 650);
    return () => clearTimeout(timeoutId);
  }, [isCouponAppliedPulseVisible]);

  const handleAddToCart = useCallback((item: MenuItem, delta: number) => {
    setCart(previousCart => {
      const existingItem = previousCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        const nextQuantity = existingItem.quantity + delta;
        if (nextQuantity <= 0) {
          return previousCart.filter(cartItem => cartItem.id !== item.id);
        }

        return previousCart.map(cartItem => (
          cartItem.id === item.id
            ? { ...cartItem, quantity: nextQuantity }
            : cartItem
        ));
      }

      if (delta > 0) {
        return [...previousCart, { ...item, quantity: 1 }];
      }

      return previousCart;
    });
  }, []);

  const handleRemoveFromCart = useCallback((itemId: string) => {
    setCart(previousCart => previousCart.filter(item => item.id !== itemId));
  }, []);

  const handleApplyCoupon = useCallback(async () => {
    if (isApplyingCouponRef.current) {
      return;
    }

    const normalizedCode = couponInput.trim().toUpperCase();
    if (!normalizedCode) {
      setCouponError('Enter a coupon code.');
      setCouponSuccess('');
      return;
    }

    isApplyingCouponRef.current = true;
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
      setCouponError(error instanceof Error ? error.message : 'Something went wrong. Try again');
    } finally {
      isApplyingCouponRef.current = false;
      setIsApplyingCoupon(false);
    }
  }, [cartTotal, couponInput, findActiveOfferByCode]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCouponCode('');
    setAppliedOffer(null);
    setCouponError('');
    setCouponSuccess('');
  }, []);

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
