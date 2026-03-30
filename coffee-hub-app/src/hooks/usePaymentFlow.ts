import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { getCurrentUserIdToken } from '../services/firebase/authService';
import { getNextOrderId } from '../services/firebase/orderCounterService';
import { createOrderRequest } from '../services/ordersService';
import { locationAdapter } from '../services/platform/locationAdapter';
import { toAppServiceError } from '../services/serviceError';
import type {
  CartItem,
  CheckoutCustomerDetails,
  CheckoutOrderDraft,
  CheckoutOrderItemPayload,
  CheckoutStep,
  CustomerProfile,
  Offer,
  Order,
  SavedAddressOption,
  SelectedAddressIndex,
  ShopTiming,
} from '../types';
import { calculateDiscount } from '../utils/calculateDiscount';
import {
  buildCheckoutClosedMessage,
  buildShopAvailabilityMessage,
  formatShopHour,
  formatShopTimingRange,
  isShopOpen,
} from '../utils/shopTiming';
import { STANDARD_DELIVERY_FEE } from '../constants/app';

type UsePaymentFlowParams = {
  currentUserId: string;
  profileSaved: CustomerProfile;
  shopTiming: ShopTiming;
  cart: CartItem[];
  cartTotal: number;
  hasCartItems: boolean;
  appliedCouponCode: string;
  appliedOffer: Offer | null;
  setAppliedCouponCode: Dispatch<SetStateAction<string>>;
  setAppliedOffer: Dispatch<SetStateAction<Offer | null>>;
  setCouponSuccess: Dispatch<SetStateAction<string>>;
  setCouponError: Dispatch<SetStateAction<string>>;
  clearCart: () => void;
  findActiveOfferByCode: (code: string) => Promise<Offer | null>;
  onOrderPlaced?: (order: Order) => void;
};

export type PaymentFlowState = {
  checkoutStep: CheckoutStep;
  setCheckoutStep: Dispatch<SetStateAction<CheckoutStep>>;
  customerDetails: CheckoutCustomerDetails;
  setCustomerDetails: Dispatch<SetStateAction<CheckoutCustomerDetails>>;
  selectedAddressIndex: SelectedAddressIndex;
  setSelectedAddressIndex: Dispatch<SetStateAction<SelectedAddressIndex>>;
  isCheckoutAddressListOpen: boolean;
  setIsCheckoutAddressListOpen: Dispatch<SetStateAction<boolean>>;
  checkoutError: string;
  setCheckoutError: Dispatch<SetStateAction<string>>;
  isLocatingCustomer: boolean;
  customerLocationError: string;
  isPlacingOrder: boolean;
  draftOrderId: string;
  setDraftOrderId: Dispatch<SetStateAction<string>>;
  savedAddressOptions: SavedAddressOption[];
  isShopOpen: boolean;
  shopTimingRangeLabel: string;
  shopStatusMessage: string;
  selectedAddressLabel: string;
  checkoutAddressSummary: string;
  checkoutPrimaryActionLabel: string;
  hasCheckoutAddressSelectionRef: MutableRefObject<boolean>;
  placedOrder: Order | null;
  setPlacedOrder: Dispatch<SetStateAction<Order | null>>;
  handleCaptureCustomerLocation: () => Promise<void>;
  handlePlaceOrder: () => Promise<void>;
};

export const usePaymentFlow = ({
  currentUserId,
  profileSaved,
  shopTiming,
  cart,
  cartTotal,
  hasCartItems,
  appliedCouponCode,
  appliedOffer,
  setAppliedCouponCode,
  setAppliedOffer,
  setCouponSuccess,
  setCouponError,
  clearCart,
  findActiveOfferByCode,
  onOrderPlaced,
}: UsePaymentFlowParams): PaymentFlowState => {
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [customerDetails, setCustomerDetails] = useState<CheckoutCustomerDetails>({
    name: '',
    phone: '',
    address: '',
    location: null,
  });
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<SelectedAddressIndex>('new');
  const [isCheckoutAddressListOpen, setIsCheckoutAddressListOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
  const [customerLocationError, setCustomerLocationError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [draftOrderId, setDraftOrderId] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const hasCheckoutAddressSelectionRef = useRef(false);

  const savedAddressOptions = useMemo<SavedAddressOption[]>(
    () =>
      profileSaved.addresses
        .map((address, index) => ({
          index,
          label: `Address ${index + 1}`,
          value: address.trim(),
        }))
        .filter(option => option.value),
    [profileSaved.addresses],
  );

  const primaryAddressOption =
    savedAddressOptions.find(option => option.index === 0) || savedAddressOptions[0] || null;

  const selectedAddressLabel =
    selectedAddressIndex === 'new'
      ? 'New Address'
      : selectedAddressIndex === 0
        ? 'Primary Address'
        : `Address ${selectedAddressIndex + 1}`;

  const selectedSavedAddress =
    typeof selectedAddressIndex === 'number'
      ? (profileSaved.addresses[selectedAddressIndex] || '')
      : '';

  const checkoutAddressSummary =
    selectedAddressIndex === 'new'
      ? customerDetails.address
      : selectedSavedAddress || customerDetails.address || primaryAddressOption?.value || '';

  const shopTimingRangeLabel = useMemo(
    () => formatShopTimingRange(shopTiming.openTime, shopTiming.closeTime),
    [shopTiming.closeTime, shopTiming.openTime],
  );

  const isShopOpenNow = useMemo(
    () => isShopOpen(shopTiming.openTime, shopTiming.closeTime, new Date(currentTime)),
    [currentTime, shopTiming.closeTime, shopTiming.openTime],
  );

  const shopStatusMessage = isShopOpenNow
    ? `Now accepting orders until ${formatShopHour(shopTiming.closeTime)}.`
    : buildCheckoutClosedMessage(shopTiming.openTime);

  const checkoutPrimaryActionLabel = isPlacingOrder
    ? 'Placing order...'
    : isShopOpenNow
      ? 'Place order'
      : buildShopAvailabilityMessage(shopTiming.openTime);

  useEffect(() => {
    if (!savedAddressOptions.length) {
      setSelectedAddressIndex('new');
      setIsCheckoutAddressListOpen(false);
      hasCheckoutAddressSelectionRef.current = false;
      return;
    }

    if (!hasCheckoutAddressSelectionRef.current) {
      setSelectedAddressIndex(savedAddressOptions[0].index);
      return;
    }

    setSelectedAddressIndex(previousIndex => {
      if (previousIndex === 'new') {
        return previousIndex;
      }

      const stillExists = savedAddressOptions.some(option => option.index === previousIndex);
      return stillExists ? previousIndex : savedAddressOptions[0].index;
    });
  }, [savedAddressOptions]);

  useEffect(() => {
    if (selectedAddressIndex === 'new') {
      return;
    }

    const selectedAddress = profileSaved.addresses[selectedAddressIndex] || '';
    setCustomerDetails(previousDetails =>
      previousDetails.address === selectedAddress
        ? previousDetails
        : { ...previousDetails, address: selectedAddress },
    );
  }, [profileSaved.addresses, selectedAddressIndex]);

  useEffect(() => {
    if (!profileSaved.name && !profileSaved.phone) {
      return;
    }

    setCustomerDetails(previousDetails => ({
      ...previousDetails,
      name: previousDetails.name || profileSaved.name,
      phone: previousDetails.phone || profileSaved.phone,
    }));
  }, [profileSaved.name, profileSaved.phone]);

  useEffect(() => {
    if (cart.length > 0 || checkoutStep === 'success') {
      return;
    }

    setCheckoutStep('cart');
    setDraftOrderId('');
    setCheckoutError('');
    setPlacedOrder(null);
  }, [cart.length, checkoutStep]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const captureLocation = async () => {
    setIsLocatingCustomer(true);
    setCustomerLocationError('');
    setCheckoutError('');

    try {
      const nextLocation = await locationAdapter.getCurrentLocation();
      setCustomerDetails(previousDetails => ({
        ...previousDetails,
        location: nextLocation,
      }));
      return nextLocation;
    } catch (error) {
      const message = toAppServiceError(
        error,
        'Unable to capture your location right now.',
        'network',
      ).message;
      console.error('Failed to capture customer location', error);
      setCustomerLocationError(message);
      return null;
    } finally {
      setIsLocatingCustomer(false);
    }
  };

  const handleCaptureCustomerLocation = async () => {
    await captureLocation();
  };

  const resetAfterSuccess = (nextOrder: Order) => {
    clearCart();
    onOrderPlaced?.(nextOrder);
    setPlacedOrder(nextOrder);
    setCheckoutStep('success');
    setDraftOrderId('');
    setAppliedCouponCode('');
    setAppliedOffer(null);
    setCouponSuccess('');
    setCouponError('');
    setCheckoutError('');
  };

  const buildDraft = async (): Promise<{ order: CheckoutOrderDraft } | null> => {
    const name = customerDetails.name.trim();
    const phone = customerDetails.phone.trim();
    const address = customerDetails.address.trim();
    let customerLocation = customerDetails.location;

    if (!name || !phone || !address) {
      setCheckoutError('Please fill in your name, phone number, and delivery address.');
      return null;
    }

    if (!customerLocation) {
      const capturedLocation = await captureLocation();
      if (!capturedLocation) {
        setCheckoutError(
          'Share your live delivery location to enable rider tracking and ETA updates.',
        );
        return null;
      }
      customerLocation = capturedLocation;
    }

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return null;
    }

    if (!currentUserId) {
      setCheckoutError('Please wait for your secure session to finish loading.');
      return null;
    }

    const deliveryFeeValue = hasCartItems ? STANDARD_DELIVERY_FEE : 0;
    let discountValue = 0;
    let discountedSubtotal = cartTotal;
    let couponCodeValue = '';

    if (appliedCouponCode) {
      try {
        const matchingOffer = await findActiveOfferByCode(appliedCouponCode);
        if (matchingOffer && cartTotal >= matchingOffer.minOrderAmount) {
          const recalculated = calculateDiscount(cartTotal, matchingOffer);
          discountValue = recalculated.discount;
          discountedSubtotal = recalculated.finalTotal;
          couponCodeValue = matchingOffer.couponCode;
          setAppliedOffer(matchingOffer);
        } else {
          setAppliedCouponCode('');
          setAppliedOffer(null);
          setCouponSuccess('');
          setCouponError('Coupon was removed because it is no longer valid.');
        }
      } catch (error) {
        console.error('Failed to validate coupon before checkout', error);
        setCouponError('Unable to validate your coupon right now.');
        setCheckoutError('Unable to validate your coupon right now.');
        return null;
      }
    }

    const finalTotal = Number((discountedSubtotal + deliveryFeeValue).toFixed(2));
    const orderId = draftOrderId || await getNextOrderId();
    setDraftOrderId(orderId);

    const items: CheckoutOrderItemPayload[] = cart.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      order: {
        orderId,
        customer: { name, phone, address, location: customerLocation },
        items,
        subtotal: cartTotal,
        discount: discountValue,
        deliveryFee: deliveryFeeValue,
        couponCode: couponCodeValue,
        finalTotal,
      },
    };
  };

  const placeCodOrder = async (draft: CheckoutOrderDraft) => {
    setIsPlacingOrder(true);
    setCheckoutError('');

    try {
      const idToken = await getCurrentUserIdToken(true);
      if (!idToken) {
        setCheckoutError('Please sign in again before placing your order.');
        return;
      }

      const orderResponse = await createOrderRequest(
        { orderDraft: draft, userId: currentUserId },
        idToken,
      );

      resetAfterSuccess(orderResponse.order);
    } catch (error) {
      console.error('Failed to place COD order', error);
      const typedError = toAppServiceError(
        error,
        'Unable to place your order right now. Please try again.',
        'network',
      );
      setCheckoutError(typedError.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!isShopOpenNow) {
      setCheckoutError(buildCheckoutClosedMessage(shopTiming.openTime));
      return;
    }

    try {
      const preparedOrder = await buildDraft();
      if (!preparedOrder) {
        return;
      }

      await placeCodOrder(preparedOrder.order);
    } catch (error) {
      console.error('Failed to prepare checkout draft', error);
      setCheckoutError(
        toAppServiceError(
          error,
          'Unable to prepare your order right now. Please try again.',
          'network',
        ).message,
      );
    }
  };

  return {
    checkoutStep,
    setCheckoutStep,
    customerDetails,
    setCustomerDetails,
    selectedAddressIndex,
    setSelectedAddressIndex,
    isCheckoutAddressListOpen,
    setIsCheckoutAddressListOpen,
    checkoutError,
    setCheckoutError,
    isLocatingCustomer,
    customerLocationError,
    isPlacingOrder,
    draftOrderId,
    setDraftOrderId,
    savedAddressOptions,
    isShopOpen: isShopOpenNow,
    shopTimingRangeLabel,
    shopStatusMessage,
    selectedAddressLabel,
    checkoutAddressSummary,
    checkoutPrimaryActionLabel,
    hasCheckoutAddressSelectionRef,
    placedOrder,
    setPlacedOrder,
    handleCaptureCustomerLocation,
    handlePlaceOrder,
  };
};
