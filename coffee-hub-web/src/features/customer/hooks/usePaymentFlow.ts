import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { createOrderRequest } from '../../../services/api/ordersService';
import { getCurrentUserIdToken } from '../../../services/auth/authService';
import { saveUserDeliveryLocation } from '../../../services/firebase/profileService';
import {
  type LocationSettingsTarget,
} from '../../../services/platform/locationAdapter';
import {
  captureCurrentLocation,
  LOCATION_FAILED_MESSAGE,
  LOCATION_REQUIRED_MESSAGE,
  openLocationSettings,
} from '../../../services/platform/locationService';
import { navigationAdapter } from '../../../services/platform/navigationAdapter';
import { getAppServiceErrorMessage } from '../../../services/platform/serviceError';
import { calculateDiscount } from '../../../utils/calculateDiscount';
import type {
  CartItem,
  CheckoutCustomerDetails,
  CheckoutOrderDraft,
  CheckoutOrderItemPayload,
  Offer,
  Order,
  ShopTiming,
} from '../../../types';
import type {
  CheckoutStep,
  CustomerProfile,
  SavedAddressOption,
  SelectedAddressIndex,
} from '../../app/types';
import {
  buildCheckoutClosedMessage,
  buildShopAvailabilityMessage,
  formatShopTime,
  formatShopTimingRange,
  isShopOpen,
} from '../../../../shared/shopTiming';
import {
  getPrimaryProfileAddress,
  isMeaningfulProfileName,
} from '../../app/lib/firestoreMappers';

type UsePaymentFlowParams = {
  currentUserId: string;
  profileSaved: CustomerProfile;
  shopTiming: ShopTiming;
  cart: CartItem[];
  cartTotal: number;
  deliveryFee: number;
  hasCartItems: boolean;
  appliedCouponCode: string;
  appliedOffer: Offer | null;
  setAppliedCouponCode: Dispatch<SetStateAction<string>>;
  setAppliedOffer: Dispatch<SetStateAction<Offer | null>>;
  setCouponSuccess: Dispatch<SetStateAction<string>>;
  setCouponError: Dispatch<SetStateAction<string>>;
  findActiveOfferByCode: (code: string) => Promise<Offer | null>;
  onBrowseMenu: () => void;
  onOrderPlaced: (order: Order) => void;
};

export type CheckoutLocationDialog = {
  action: 'retry' | 'settings';
  actionLabel: string;
  message: string;
  title: string;
};

export type PaymentFlowState = {
  isCartOpen: boolean;
  setIsCartOpen: Dispatch<SetStateAction<boolean>>;
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
  canOpenLocationSettings: boolean;
  locationSettingsTarget: LocationSettingsTarget | null;
  isPlacingOrder: boolean;
  hasDeliveryLocation: boolean;
  draftOrderId: string;
  setDraftOrderId: Dispatch<SetStateAction<string>>;
  locationDialog: CheckoutLocationDialog | null;
  savedAddressOptions: SavedAddressOption[];
  isShopOpen: boolean;
  shopTimingRangeLabel: string;
  shopStatusMessage: string;
  selectedAddressLabel: string;
  checkoutAddressSummary: string;
  checkoutPrimaryActionLabel: string;
  hasCheckoutAddressSelectionRef: MutableRefObject<boolean>;
  handleCloseLocationDialog: () => void;
  handleBrowseMenu: () => void;
  handleCaptureCustomerLocation: () => Promise<void>;
  handleLocationDialogAction: () => Promise<void>;
  handleOpenLocationSettings: () => Promise<void>;
  handlePlaceOrder: () => Promise<void>;
};

/**
 * Manages checkout step flow, address selection, geolocation capture,
 * and COD order placement through the backend API.
 * Extracted from useCheckoutFlow for single-responsibility.
 */
export const usePaymentFlow = ({
  currentUserId,
  profileSaved,
  shopTiming,
  cart,
  cartTotal,
  deliveryFee,
  hasCartItems,
  appliedCouponCode,
  appliedOffer,
  setAppliedCouponCode,
  setAppliedOffer,
  setCouponSuccess,
  setCouponError,
  findActiveOfferByCode,
  onBrowseMenu,
  onOrderPlaced,
}: UsePaymentFlowParams): PaymentFlowState => {
  const [isCartOpen, setIsCartOpen] = useState(false);
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
  const [canOpenLocationSettings, setCanOpenLocationSettings] = useState(false);
  const [locationSettingsTarget, setLocationSettingsTarget] =
    useState<LocationSettingsTarget | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [locationDialog, setLocationDialog] = useState<CheckoutLocationDialog | null>(null);
  const [draftOrderId, setDraftOrderId] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const hasCheckoutAddressSelectionRef = useRef(false);
  const isPlacingOrderRef = useRef(false);
  const autofillName = isMeaningfulProfileName(profileSaved.name, profileSaved.phone)
    ? profileSaved.name.trim()
    : '';
  const autofillAddress = getPrimaryProfileAddress(profileSaved);

  // Derived address options from saved profile
  const savedAddressOptions = useMemo<SavedAddressOption[]>(
    () =>
      profileSaved.addresses
        .map((address, index) => ({ index, label: `Address ${index + 1}`, value: address.trim() }))
        .filter(option => option.value),
    [profileSaved.addresses],
  );

  const primaryAddressOption = savedAddressOptions.find(o => o.index === 0) || savedAddressOptions[0] || null;

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
    ? `Now accepting orders until ${formatShopTime(shopTiming.closeTime)}.`
    : buildCheckoutClosedMessage(shopTiming.openTime);
  const hasDeliveryLocation = Boolean(customerDetails.location);

  const checkoutPrimaryActionLabel = isPlacingOrder
    ? 'Placing order...'
    : !isShopOpenNow
      ? buildShopAvailabilityMessage(shopTiming.openTime)
      : hasDeliveryLocation
        ? 'Place order'
        : 'Give location to continue';

  // Auto-select saved address on first load
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
    setSelectedAddressIndex(prev => {
      if (prev === 'new') return prev;
      const stillExists = savedAddressOptions.some(o => o.index === prev);
      return stillExists ? prev : savedAddressOptions[0].index;
    });
  }, [savedAddressOptions]);

  // Sync selected saved address into customerDetails
  useEffect(() => {
    if (selectedAddressIndex === 'new') return;
    const selectedAddress = profileSaved.addresses[selectedAddressIndex] || '';
    setCustomerDetails(prev =>
      prev.address === selectedAddress ? prev : { ...prev, address: selectedAddress },
    );
  }, [profileSaved.addresses, selectedAddressIndex]);

  // Pre-fill name/phone from saved profile
  useEffect(() => {
    if (!autofillName && !profileSaved.phone && !autofillAddress) return;
    setCustomerDetails(prev => ({
      ...prev,
      address: prev.address || autofillAddress,
      name: prev.name || autofillName,
      phone: prev.phone || profileSaved.phone,
    }));
  }, [autofillAddress, autofillName, profileSaved.phone]);

  // Reset to cart step when cart empties
  useEffect(() => {
    if (cart.length > 0 || checkoutStep === 'success') return;
    setCheckoutStep('cart');
    setDraftOrderId('');
    setCheckoutError('');
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
    setCanOpenLocationSettings(false);
    setLocationSettingsTarget(null);
    setLocationDialog(null);
    setCheckoutError('');
    try {
      const captureResult = await captureCurrentLocation({
        enableHighAccuracy: true,
        enableLocationFallback: true,
        maxAttempts: 1,
        maximumAgeMs: 0,
        timeoutMs: 5000,
      });

      if (!captureResult.location) {
        setCustomerLocationError(captureResult.message);
        setCanOpenLocationSettings(captureResult.canOpenLocationSettings);
        setLocationSettingsTarget(captureResult.locationSettingsTarget);
        setLocationDialog({
          action: captureResult.canOpenLocationSettings ? 'settings' : 'retry',
          actionLabel: captureResult.canOpenLocationSettings ? 'Enable Location' : 'Try Again',
          message: captureResult.message,
          title:
            captureResult.errorCode === 'permission_denied'
              ? 'Location required'
              : 'Unable to get location',
        });
        return null;
      }

      setCustomerDetails(prev => ({ ...prev, location: captureResult.location }));
      setCustomerLocationError('');
      setCanOpenLocationSettings(false);
      setLocationSettingsTarget(null);
      setLocationDialog(null);
      if (currentUserId) {
        void saveUserDeliveryLocation({
          currentUserId,
          location: captureResult.location,
        }).catch(error => {
          console.error('Failed to save customer delivery location', error);
        });
      }
      return captureResult.location;
    } catch (error) {
      const message = getAppServiceErrorMessage(
        error,
        LOCATION_FAILED_MESSAGE,
      );
      setCustomerLocationError(message);
      setCanOpenLocationSettings(false);
      setLocationSettingsTarget(null);
      setLocationDialog({
        action: 'retry',
        actionLabel: 'Try Again',
        message,
        title: 'Unable to get location',
      });
      return null;
    } finally {
      setIsLocatingCustomer(false);
    }
  };

  const handleCaptureCustomerLocation = async () => {
    await captureLocation();
  };

  const handleOpenLocationSettings = async () => {
    const target = locationSettingsTarget ?? 'app';
    const didOpenSettings = await openLocationSettings(target);
    if (didOpenSettings) {
      setLocationDialog(null);
      return;
    }

    if (!didOpenSettings) {
      setCustomerLocationError(
        target === 'location'
          ? LOCATION_FAILED_MESSAGE
          : LOCATION_REQUIRED_MESSAGE,
      );
    }
  };

  const handleCloseLocationDialog = () => {
    setLocationDialog(null);
  };

  const handleLocationDialogAction = async () => {
    if (!locationDialog) {
      return;
    }

    if (locationDialog.action === 'settings') {
      await handleOpenLocationSettings();
      return;
    }

    setLocationDialog(null);
    await captureLocation();
  };

  const handleBrowseMenu = () => {
    onBrowseMenu();
    setIsCartOpen(false);
    setCheckoutStep('cart');
    setCheckoutError('');
    setCustomerLocationError('');
    setCanOpenLocationSettings(false);
    setLocationSettingsTarget(null);
    setLocationDialog(null);
    setDraftOrderId('');
    navigationAdapter.scrollToSectionOrTop('menu-section');
  };

  const resetAfterSuccess = (nextOrder: Order) => {
    onOrderPlaced(nextOrder);
    setCheckoutStep('success');
    setDraftOrderId('');
    setAppliedCouponCode('');
    setAppliedOffer(null);
    setCouponSuccess('');
    setCouponError('');
    setCheckoutError('');
    setCustomerLocationError('');
    setCanOpenLocationSettings(false);
    setLocationSettingsTarget(null);
    setLocationDialog(null);
  };

  const buildDraft = async (): Promise<{ order: CheckoutOrderDraft } | null> => {
    const name = customerDetails.name.trim();
    const phone = customerDetails.phone.trim();
    const address = customerDetails.address.trim();
    const customerLocation = customerDetails.location;

    if (!name || !phone || !address) {
      setCheckoutError('Please fill in your name, phone number, and delivery address.');
      return null;
    }

    if (!customerLocation) {
      setCustomerLocationError(LOCATION_REQUIRED_MESSAGE);
      setCheckoutError('Location is required for delivery.');
      setLocationDialog({
        action: canOpenLocationSettings ? 'settings' : 'retry',
        actionLabel: canOpenLocationSettings ? 'Enable Location' : 'Give Location',
        message: LOCATION_REQUIRED_MESSAGE,
        title: 'Location required',
      });
      return null;
    }

    if (cart.length === 0) { setCheckoutError('Your cart is empty.'); return null; }
    if (!currentUserId) { setCheckoutError('Please sign in with your mobile number to place an order.'); return null; }

    const deliveryFeeValue = hasCartItems ? Number(deliveryFee.toFixed(2)) : 0;
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
        setCouponError('Unable to validate your coupon right now.');
        setCheckoutError('Unable to validate your coupon right now.');
        return null;
      }
    }

    const finalTotal = Number((discountedSubtotal + deliveryFeeValue).toFixed(2));

    const items: CheckoutOrderItemPayload[] = cart.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      order: {
        customer: { name, phone, address, location: customerLocation },
        items,
        subtotal: cartTotal,
        discount: discountValue,
        deliveryFee: deliveryFeeValue,
        couponCode: couponCodeValue,
        finalTotal,
      } satisfies CheckoutOrderDraft,
    };
  };

  const placeCodOrder = async (draft: CheckoutOrderDraft) => {
    if (isPlacingOrderRef.current) {
      return;
    }

    isPlacingOrderRef.current = true;
    setIsPlacingOrder(true);
    setCheckoutError('');
    try {
      const idToken = await getCurrentUserIdToken(true);
      if (!idToken) {
        setCheckoutError('Please sign in again before placing your order.');
        return;
      }

      const orderResponse = await createOrderRequest(
        { orderDraft: draft },
        idToken,
      );

      resetAfterSuccess(orderResponse.order);
    } catch (error) {
      const typedError = error as Error;
      setCheckoutError(typedError.message || 'Something went wrong. Try again');
    } finally {
      isPlacingOrderRef.current = false;
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (isPlacingOrderRef.current) {
      return;
    }

    if (!isShopOpenNow) {
      setCheckoutError(buildCheckoutClosedMessage(shopTiming.openTime));
      return;
    }

    try {
      const preparedOrder = await buildDraft();
      if (!preparedOrder) return;
      await placeCodOrder(preparedOrder.order);
    } catch (error) {
      setCheckoutError(
        getAppServiceErrorMessage(
          error,
          'Something went wrong. Try again',
        ),
      );
    }
  };

  return {
    isCartOpen,
    setIsCartOpen,
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
    canOpenLocationSettings,
    locationSettingsTarget,
    isPlacingOrder,
    hasDeliveryLocation,
    draftOrderId,
    setDraftOrderId,
    locationDialog,
    savedAddressOptions,
    isShopOpen: isShopOpenNow,
    shopTimingRangeLabel,
    shopStatusMessage,
    selectedAddressLabel,
    checkoutAddressSummary,
    checkoutPrimaryActionLabel,
    hasCheckoutAddressSelectionRef,
    handleCloseLocationDialog,
    handleBrowseMenu,
    handleCaptureCustomerLocation,
    handleLocationDialogAction,
    handleOpenLocationSettings,
    handlePlaceOrder,
  };
};
