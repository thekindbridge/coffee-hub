/**
 * useCheckoutFlow — thin composer hook.
 *
 * Composes useCart (cart state + coupon + totals) and
 * usePaymentFlow (checkout steps + address selection + order placement)
 * into a single API, preserving full backward compatibility.
 */
import { useCart } from './useCart';
import { usePaymentFlow } from './usePaymentFlow';
import type { Offer, Order } from '../../../types';
import type { CustomerProfile } from '../../app/types';

type UseCheckoutFlowParams = {
  currentUserId: string;
  currentUserEmail: string;
  profileSaved: CustomerProfile;
  findActiveOfferByCode: (couponCode: string) => Promise<Offer | null>;
  onBrowseMenu: () => void;
  onOrderPlaced: (order: Order) => void;
};

export const useCheckoutFlow = ({
  currentUserId,
  currentUserEmail,
  profileSaved,
  findActiveOfferByCode,
  onBrowseMenu,
  onOrderPlaced,
}: UseCheckoutFlowParams) => {
  const cart = useCart({ findActiveOfferByCode });

  const payment = usePaymentFlow({
    currentUserId,
    currentUserEmail,
    profileSaved,
    cart: cart.cart,
    cartTotal: cart.cartTotal,
    hasCartItems: cart.hasCartItems,
    appliedCouponCode: cart.appliedCouponCode,
    appliedOffer: cart.appliedOffer,
    setAppliedCouponCode: cart.setAppliedCouponCode,
    setAppliedOffer: cart.setAppliedOffer,
    setCouponSuccess: cart.setCouponSuccess,
    setCouponError: cart.setCouponError,
    findActiveOfferByCode,
    onBrowseMenu,
    onOrderPlaced,
  });

  return {
    // Cart
    cart: cart.cart,
    setCart: cart.setCart,
    couponInput: cart.couponInput,
    setCouponInput: cart.setCouponInput,
    appliedCouponCode: cart.appliedCouponCode,
    setAppliedCouponCode: cart.setAppliedCouponCode,
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
    handleAddToCart: cart.handleAddToCart,
    handleRemoveFromCart: cart.handleRemoveFromCart,
    handleApplyCoupon: cart.handleApplyCoupon,
    handleRemoveCoupon: cart.handleRemoveCoupon,

    // Payment / checkout flow
    isCartOpen: payment.isCartOpen,
    setIsCartOpen: payment.setIsCartOpen,
    checkoutStep: payment.checkoutStep,
    setCheckoutStep: payment.setCheckoutStep,
    customerDetails: payment.customerDetails,
    setCustomerDetails: payment.setCustomerDetails,
    selectedAddressIndex: payment.selectedAddressIndex,
    setSelectedAddressIndex: payment.setSelectedAddressIndex,
    isCheckoutAddressListOpen: payment.isCheckoutAddressListOpen,
    setIsCheckoutAddressListOpen: payment.setIsCheckoutAddressListOpen,
    checkoutError: payment.checkoutError,
    setCheckoutError: payment.setCheckoutError,
    isLocatingCustomer: payment.isLocatingCustomer,
    customerLocationError: payment.customerLocationError,
    isPlacingOrder: payment.isPlacingOrder,
    draftOrderId: payment.draftOrderId,
    setDraftOrderId: payment.setDraftOrderId,
    savedAddressOptions: payment.savedAddressOptions,
    selectedAddressLabel: payment.selectedAddressLabel,
    checkoutAddressSummary: payment.checkoutAddressSummary,
    checkoutPrimaryActionLabel: payment.checkoutPrimaryActionLabel,
    hasCheckoutAddressSelectionRef: payment.hasCheckoutAddressSelectionRef,
    handleBrowseMenu: payment.handleBrowseMenu,
    handleCaptureCustomerLocation: payment.handleCaptureCustomerLocation,
    handlePlaceOrder: payment.handlePlaceOrder,
  };
};
