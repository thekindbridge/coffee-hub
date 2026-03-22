/**
 * useCheckoutFlow — thin composer hook.
 *
 * Composes useCart (cart state + coupon + totals) and
 * usePaymentFlow (checkout steps + address selection + COD order placement)
 * into a single API, preserving full backward compatibility.
 */
import { useCart } from './useCart';
import { usePaymentFlow } from './usePaymentFlow';
import type { Offer, Order } from '../../../types';
import type { CustomerProfile } from '../../app/types';

type UseCheckoutFlowParams = {
  currentUserId: string;
  profileSaved: CustomerProfile;
  findActiveOfferByCode: (couponCode: string) => Promise<Offer | null>;
  onBrowseMenu: () => void;
  onOrderPlaced: (order: Order) => void;
};

export const useCheckoutFlow = ({
  currentUserId,
  profileSaved,
  findActiveOfferByCode,
  onBrowseMenu,
  onOrderPlaced,
}: UseCheckoutFlowParams) => {
  const cart = useCart({ findActiveOfferByCode });

  const orderFlow = usePaymentFlow({
    currentUserId,
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
    isCartOpen: orderFlow.isCartOpen,
    setIsCartOpen: orderFlow.setIsCartOpen,
    checkoutStep: orderFlow.checkoutStep,
    setCheckoutStep: orderFlow.setCheckoutStep,
    customerDetails: orderFlow.customerDetails,
    setCustomerDetails: orderFlow.setCustomerDetails,
    selectedAddressIndex: orderFlow.selectedAddressIndex,
    setSelectedAddressIndex: orderFlow.setSelectedAddressIndex,
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
    selectedAddressLabel: orderFlow.selectedAddressLabel,
    checkoutAddressSummary: orderFlow.checkoutAddressSummary,
    checkoutPrimaryActionLabel: orderFlow.checkoutPrimaryActionLabel,
    hasCheckoutAddressSelectionRef: orderFlow.hasCheckoutAddressSelectionRef,
    handleBrowseMenu: orderFlow.handleBrowseMenu,
    handleCaptureCustomerLocation: orderFlow.handleCaptureCustomerLocation,
    handlePlaceOrder: orderFlow.handlePlaceOrder,
  };
};
