import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { useAuth } from '../auth/context/AuthContext';
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
  SelectedAddressId,
  ShopTiming,
} from '../types';
import { calculateDiscount } from '../utils/calculateDiscount';
import {
  buildCheckoutClosedMessage,
  buildOpensInMessage,
  formatShopTime,
  formatShopTimingRange,
  getCurrentTimeInMinutes,
  isShopOpen,
} from '../shared/shopTiming';
import { STANDARD_DELIVERY_FEE } from '../constants/app';

type UsePaymentFlowParams = {
  currentUserId: string;
  isShopTimingLoading: boolean;
  profileSaved: CustomerProfile;
  refreshShopTiming: () => Promise<ShopTiming>;
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
  currentTimeInMinutes: number;
  findActiveOfferByCode: (code: string) => Promise<Offer | null>;
  onOrderPlaced?: (order: Order) => void;
};

export type PaymentFlowState = {
  checkoutStep: CheckoutStep;
  setCheckoutStep: Dispatch<SetStateAction<CheckoutStep>>;
  customerDetails: CheckoutCustomerDetails;
  setCustomerDetails: Dispatch<SetStateAction<CheckoutCustomerDetails>>;
  selectedAddressId: SelectedAddressId;
  setSelectedAddressId: Dispatch<SetStateAction<SelectedAddressId>>;
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
  shopTiming: ShopTiming;
  currentTime: number;
  shopTimingRangeLabel: string;
  shopCountdownMessage: string;
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
  isShopTimingLoading,
  profileSaved,
  refreshShopTiming,
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
  currentTimeInMinutes,
  findActiveOfferByCode,
  onOrderPlaced,
}: UsePaymentFlowParams): PaymentFlowState => {
  const { user } = useAuth();
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [customerDetails, setCustomerDetails] = useState<CheckoutCustomerDetails>({
    name: '',
    phone: '',
    address: '',
    location: null,
  });
  const [selectedAddressId, setSelectedAddressId] = useState<SelectedAddressId>('new');
  const [isCheckoutAddressListOpen, setIsCheckoutAddressListOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
  const [customerLocationError, setCustomerLocationError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [draftOrderId, setDraftOrderId] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const hasCheckoutAddressSelectionRef = useRef(false);

  const savedAddressOptions = useMemo<SavedAddressOption[]>(
    () =>
      profileSaved.addresses
        .map(address => ({
          id: address.id,
          label: address.label,
          value: address.address.trim(),
          isPrimary: address.isPrimary,
        }))
        .filter(option => option.value),
    [profileSaved.addresses],
  );

  const primaryAddressOption =
    savedAddressOptions.find(option => option.isPrimary) || savedAddressOptions[0] || null;

  const selectedAddressLabel =
    selectedAddressId === 'new'
      ? 'New Address'
      : savedAddressOptions.find(option => option.id === selectedAddressId)?.label || 'Saved Address';

  const selectedSavedAddress =
    selectedAddressId !== 'new'
      ? (
          profileSaved.addresses.find(address => address.id === selectedAddressId)?.address || ''
        )
      : '';

  const checkoutAddressSummary =
    selectedAddressId === 'new'
      ? customerDetails.address
      : selectedSavedAddress || customerDetails.address || primaryAddressOption?.value || '';

  const shopTimingRangeLabel = useMemo(
    () => isShopTimingLoading
      ? 'Checking shop timing...'
      : formatShopTimingRange(shopTiming.openTime, shopTiming.closeTime),
    [isShopTimingLoading, shopTiming.closeTime, shopTiming.openTime],
  );

  const isShopOpenNow = useMemo(
    () => !isShopTimingLoading && isShopOpen(shopTiming.openTime, shopTiming.closeTime, currentTimeInMinutes),
    [currentTimeInMinutes, isShopTimingLoading, shopTiming.closeTime, shopTiming.openTime],
  );

  const shopCountdownMessage = isShopOpenNow
    ? ''
    : buildOpensInMessage(shopTiming.openTime, currentTimeInMinutes);

  const shopStatusMessage = isShopTimingLoading
    ? 'Checking live shop timing...'
    : isShopOpenNow
    ? `Now accepting orders until ${formatShopTime(shopTiming.closeTime)}.`
    : `${buildCheckoutClosedMessage(shopTiming.openTime)} ${shopCountdownMessage}`.trim();

  const checkoutPrimaryActionLabel = isPlacingOrder
    ? 'Placing order...'
    : isShopTimingLoading
      ? 'Checking hours...'
    : isShopOpenNow
      ? 'Place order'
      : `Opens at ${formatShopTime(shopTiming.openTime)}`;

  useEffect(() => {
    if (!savedAddressOptions.length) {
      setSelectedAddressId('new');
      setIsCheckoutAddressListOpen(false);
      hasCheckoutAddressSelectionRef.current = false;
      return;
    }

    if (!hasCheckoutAddressSelectionRef.current) {
      setSelectedAddressId(primaryAddressOption?.id || savedAddressOptions[0].id);
      return;
    }

    setSelectedAddressId(previousId => {
      if (previousId === 'new') {
        return previousId;
      }

      const stillExists = savedAddressOptions.some(option => option.id === previousId);
      return stillExists ? previousId : (primaryAddressOption?.id || savedAddressOptions[0].id);
    });
  }, [primaryAddressOption?.id, savedAddressOptions]);

  useEffect(() => {
    if (selectedAddressId === 'new') {
      return;
    }

    const selectedAddress = profileSaved.addresses.find(
      address => address.id === selectedAddressId,
    )?.address || '';
    setCustomerDetails(previousDetails =>
      previousDetails.address === selectedAddress
        ? previousDetails
        : { ...previousDetails, address: selectedAddress },
    );
  }, [profileSaved.addresses, selectedAddressId]);

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

    if (!user || !user.email) {
      setCheckoutError('User not found.');
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
      if (!user || !user.email) {
        setCheckoutError('User not found.');
        return;
      }

      const orderResponse = await createOrderRequest(
        {
          orderDraft: draft,
          role: user.role,
          userEmail: user.email,
          userId: user.email,
        },
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
    let latestShopTiming = shopTiming;

    try {
      latestShopTiming = await refreshShopTiming();
    } catch (error) {
      console.error('Failed to refresh shop timing before checkout', error);
    }

    if (!isShopOpen(latestShopTiming.openTime, latestShopTiming.closeTime, getCurrentTimeInMinutes())) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Shop is closed', ToastAndroid.SHORT);
      } else {
        Alert.alert('Shop Closed', 'Shop is closed');
      }
      setCheckoutError(buildCheckoutClosedMessage(latestShopTiming.openTime));
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
    selectedAddressId,
    setSelectedAddressId,
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
    shopTiming,
    currentTime: currentTimeInMinutes,
    shopTimingRangeLabel,
    shopCountdownMessage,
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
