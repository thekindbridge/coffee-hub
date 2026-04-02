import { useCallback } from 'react';
import { useCart } from './useCart';
import { usePaymentFlow } from './usePaymentFlow';
import type {
  CustomerProfile,
  MenuItem,
  Offer,
  Order,
  ShopTiming,
} from '../types';

const DEFAULT_NOTIFICATION_SETTINGS = {
  orderUpdates: true,
  promotions: false,
} as const;

const DEFAULT_PROFILE: CustomerProfile = {
  name: '',
  phone: '',
  email: '',
  addresses: [],
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
};

const findInactiveOffer = async (): Promise<Offer | null> => null;

type UseCheckoutFlowParams = {
  currentUserId: string;
  profileSaved?: CustomerProfile;
  shopTiming: ShopTiming;
  findActiveOfferByCode?: (couponCode: string) => Promise<Offer | null>;
  onOrderPlaced?: (order: Order) => void;
};

export const useCheckoutFlow = ({
  currentUserId,
  profileSaved = DEFAULT_PROFILE,
  shopTiming,
  findActiveOfferByCode = findInactiveOffer,
  onOrderPlaced,
}: UseCheckoutFlowParams) => {
  const cart = useCart({ findActiveOfferByCode });

  const orderFlow = usePaymentFlow({
    currentUserId,
    profileSaved,
    shopTiming,
    cart: cart.cart,
    cartTotal: cart.cartTotal,
    hasCartItems: cart.hasCartItems,
    appliedCouponCode: cart.appliedCouponCode,
    appliedOffer: cart.appliedOffer,
    setAppliedCouponCode: cart.setAppliedCouponCode,
    setAppliedOffer: cart.setAppliedOffer,
    setCouponSuccess: cart.setCouponSuccess,
    setCouponError: cart.setCouponError,
    clearCart: () => cart.setCart([]),
    findActiveOfferByCode,
    onOrderPlaced,
  });

  const handleAddToCart = useCallback((item: MenuItem, delta: number) => {
    if (delta > 0 && !orderFlow.isShopOpen) {
      return;
    }

    cart.handleAddToCart(item, delta);
  }, [cart.handleAddToCart, orderFlow.isShopOpen]);

  return {
    currentUserId,
    cart: cart.cart,
    setCart: cart.setCart,
    couponInput: cart.couponInput,
    setCouponInput: cart.setCouponInput,
    appliedCouponCode: cart.appliedCouponCode,
    setAppliedCouponCode: cart.setAppliedCouponCode,
    appliedOffer: cart.appliedOffer,
    setAppliedOffer: cart.setAppliedOffer,
    couponError: cart.couponError,
    setCouponError: cart.setCouponError,
    couponSuccess: cart.couponSuccess,
    setCouponSuccess: cart.setCouponSuccess,
    isApplyingCoupon: cart.isApplyingCoupon,
    isCouponAppliedPulseVisible: cart.isCouponAppliedPulseVisible,
    hasCartItems: cart.hasCartItems,
    cartTotal: cart.cartTotal,
    cartCount: cart.cartCount,
    cartQuantityById: cart.cartQuantityById,
    discountAmount: cart.discountAmount,
    deliveryFee: cart.deliveryFee,
    payableCartTotal: cart.payableCartTotal,
    handleAddToCart,
    handleRemoveFromCart: cart.handleRemoveFromCart,
    handleApplyCoupon: cart.handleApplyCoupon,
    handleRemoveCoupon: cart.handleRemoveCoupon,

    checkoutStep: orderFlow.checkoutStep,
    setCheckoutStep: orderFlow.setCheckoutStep,
    customerDetails: orderFlow.customerDetails,
    setCustomerDetails: orderFlow.setCustomerDetails,
    selectedAddressId: orderFlow.selectedAddressId,
    setSelectedAddressId: orderFlow.setSelectedAddressId,
    isCheckoutAddressListOpen: orderFlow.isCheckoutAddressListOpen,
    setIsCheckoutAddressListOpen: orderFlow.setIsCheckoutAddressListOpen,
    checkoutError: orderFlow.checkoutError,
    setCheckoutError: orderFlow.setCheckoutError,
    isLocatingCustomer: orderFlow.isLocatingCustomer,
    customerLocationError: orderFlow.customerLocationError,
    isPlacingOrder: orderFlow.isPlacingOrder,
    draftOrderId: orderFlow.draftOrderId,
    setDraftOrderId: orderFlow.setDraftOrderId,
    savedAddressOptions: orderFlow.savedAddressOptions,
    isShopOpen: orderFlow.isShopOpen,
    shopTimingRangeLabel: orderFlow.shopTimingRangeLabel,
    shopStatusMessage: orderFlow.shopStatusMessage,
    selectedAddressLabel: orderFlow.selectedAddressLabel,
    checkoutAddressSummary: orderFlow.checkoutAddressSummary,
    checkoutPrimaryActionLabel: orderFlow.checkoutPrimaryActionLabel,
    hasCheckoutAddressSelectionRef: orderFlow.hasCheckoutAddressSelectionRef,
    placedOrder: orderFlow.placedOrder,
    setPlacedOrder: orderFlow.setPlacedOrder,
    handleCaptureCustomerLocation: orderFlow.handleCaptureCustomerLocation,
    handlePlaceOrder: orderFlow.handlePlaceOrder,
  };
};
