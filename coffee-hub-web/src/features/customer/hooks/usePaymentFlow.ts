import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { loadRazorpayCheckout } from '../../../utils/loadRazorpayCheckout';
import { postPaymentApi } from '../../../utils/paymentApi';
import { calculateDiscount } from '../../../utils/calculateDiscount';
import type {
  CartItem,
  CheckoutCustomerDetails,
  CheckoutOrderDraft,
  CheckoutOrderItemPayload,
  Offer,
  Order,
  RazorpayOrderResponse,
  RazorpayVerificationResponse,
} from '../../../types';
import {
  CURRENCY_SYMBOL,
  RAZORPAY_KEY_ID,
  STANDARD_DELIVERY_FEE,
} from '../../app/lib/constants';
import { buildLocalOrderState } from '../../app/lib/firestoreMappers';
import type {
  CheckoutStep,
  CustomerProfile,
  SavedAddressOption,
  SelectedAddressIndex,
} from '../../app/types';

type UsePaymentFlowParams = {
  currentUserId: string;
  currentUserEmail: string;
  profileSaved: CustomerProfile;
  cart: CartItem[];
  cartTotal: number;
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
  isPlacingOrder: boolean;
  draftOrderId: string;
  setDraftOrderId: Dispatch<SetStateAction<string>>;
  savedAddressOptions: SavedAddressOption[];
  selectedAddressLabel: string;
  checkoutAddressSummary: string;
  isPayOnlineSelected: boolean;
  checkoutPrimaryActionLabel: string;
  hasCheckoutAddressSelectionRef: React.MutableRefObject<boolean>;
  handleBrowseMenu: () => void;
  handleCaptureCustomerLocation: () => Promise<void>;
  handlePlaceOrder: () => Promise<void>;
};

import type React from 'react';

const getCurrentBrowserLocation = () =>
  new Promise<CheckoutCustomerDetails['location']>((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? Number(position.coords.accuracy.toFixed(1))
            : undefined,
        });
      },
      error => {
        reject(new Error(error.message || 'Unable to access your location.'));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });

const getNextOrderId = async (): Promise<string> => {
  const counterRef = doc(db, 'meta', 'orderCounter');
  const nextNumber = await runTransaction(db, async transaction => {
    const counterSnapshot = await transaction.get(counterRef);
    const currentValue =
      counterSnapshot.exists() && typeof counterSnapshot.data().nextOrderNumber === 'number'
        ? counterSnapshot.data().nextOrderNumber
        : 1001;
    transaction.set(counterRef, { nextOrderNumber: currentValue + 1 }, { merge: true });
    return currentValue;
  });
  return `COF${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Manages checkout step flow, address selection, geolocation capture,
 * and order placement (COD + Razorpay online payment).
 * Extracted from useCheckoutFlow for single-responsibility.
 */
export const usePaymentFlow = ({
  currentUserId,
  currentUserEmail,
  profileSaved,
  cart,
  cartTotal,
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
    payment: 'Pay Online',
  });
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<SelectedAddressIndex>('new');
  const [isCheckoutAddressListOpen, setIsCheckoutAddressListOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
  const [customerLocationError, setCustomerLocationError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [draftOrderId, setDraftOrderId] = useState('');
  const hasCheckoutAddressSelectionRef = useRef(false);

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

  const isPayOnlineSelected = customerDetails.payment === 'Pay Online';
  const checkoutPrimaryActionLabel = isPlacingOrder
    ? (isPayOnlineSelected ? 'Opening payment...' : 'Placing order...')
    : (isPayOnlineSelected ? 'Pay online' : 'Confirm order');

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
    if (!profileSaved.name && !profileSaved.phone) return;
    setCustomerDetails(prev => ({
      ...prev,
      name: prev.name || profileSaved.name,
      phone: prev.phone || profileSaved.phone,
    }));
  }, [profileSaved.name, profileSaved.phone]);

  // Reset to cart step when cart empties
  useEffect(() => {
    if (cart.length > 0 || checkoutStep === 'success') return;
    setCheckoutStep('cart');
    setDraftOrderId('');
    setCheckoutError('');
  }, [cart.length, checkoutStep]);

  const captureLocation = async () => {
    setIsLocatingCustomer(true);
    setCustomerLocationError('');
    setCheckoutError('');
    try {
      const nextLocation = await getCurrentBrowserLocation();
      setCustomerDetails(prev => ({ ...prev, location: nextLocation }));
      return nextLocation;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to capture your location right now.';
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

  const handleBrowseMenu = () => {
    onBrowseMenu();
    setIsCartOpen(false);
    setCheckoutStep('cart');
    setCheckoutError('');
    setDraftOrderId('');
    window.setTimeout(() => {
      const menuSection = document.getElementById('menu-section');
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
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
      const captured = await captureLocation();
      if (!captured) {
        setCheckoutError('Share your live delivery location to enable rider tracking and ETA updates.');
        return null;
      }
      customerLocation = captured;
    }
    if (cart.length === 0) { setCheckoutError('Your cart is empty.'); return null; }
    if (!currentUserId) { setCheckoutError('Please sign in with Google to place an order.'); return null; }

    const deliveryFeeValue = hasCartItems ? STANDARD_DELIVERY_FEE : 0;
    let discountValue = 0;
    let discountedSubtotal = cartTotal;
    let couponCodeValue = '';

    if (appliedCouponCode) {
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
      } satisfies CheckoutOrderDraft,
    };
  };

  const placeCodOrder = async (draft: CheckoutOrderDraft) => {
    setIsPlacingOrder(true);
    setCheckoutError('');
    try {
      const orderRef = doc(collection(db, 'orders'));
      const batch = writeBatch(db);
      batch.set(orderRef, {
        orderId: draft.orderId,
        userId: currentUserId,
        name: draft.customer.name,
        phone: draft.customer.phone,
        address: draft.customer.address,
        customerLocation: draft.customer.location,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'pending',
        status: 'Pending',
        subtotal: draft.subtotal,
        discount: draft.discount,
        deliveryFee: draft.deliveryFee,
        couponCode: draft.couponCode,
        finalTotal: draft.finalTotal,
        total: draft.finalTotal,
        createdAt: serverTimestamp(),
      });
      for (const item of draft.items) {
        const itemRef = doc(collection(db, 'order_items'));
        batch.set(itemRef, {
          orderId: draft.orderId,
          orderDocId: orderRef.id,
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        });
      }
      await batch.commit();
      resetAfterSuccess(buildLocalOrderState({
        docId: orderRef.id,
        orderId: draft.orderId,
        customer: draft.customer,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'pending',
        userId: currentUserId,
        subtotal: draft.subtotal,
        discount: draft.discount,
        deliveryFee: draft.deliveryFee,
        couponCode: draft.couponCode,
        finalTotal: draft.finalTotal,
        items: draft.items,
      }));
    } catch (error) {
      console.error('Failed to place cash on delivery order', error);
      setCheckoutError('Unable to place your order right now. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const startOnlinePayment = async (draft: CheckoutOrderDraft) => {
    if (!RAZORPAY_KEY_ID) {
      setCheckoutError('Razorpay key is missing. Add VITE_RAZORPAY_KEY_ID to your frontend environment.');
      return;
    }
    setIsPlacingOrder(true);
    setCheckoutError('');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) {
        setCheckoutError('Please sign in again before starting payment.');
        setIsPlacingOrder(false);
        return;
      }

      const didLoad = await loadRazorpayCheckout();
      if (!didLoad || !window.Razorpay) {
        setCheckoutError('Unable to load Razorpay checkout right now. Please try again.');
        setDraftOrderId('');
        setIsPlacingOrder(false);
        return;
      }

      const paymentOrder = await postPaymentApi<RazorpayOrderResponse>(
        '/api/create-order',
        { orderDraft: draft, userId: currentUserId },
        idToken,
      );

      const razorpay = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Coffee HUB',
        description: 'Food Order Payment',
        order_id: paymentOrder.razorpayOrderId,
        prefill: { name: draft.customer.name, email: currentUserEmail, contact: draft.customer.phone },
        notes: { orderId: draft.orderId },
        theme: { color: '#8b4a20' },
        handler: async response => {
          setIsPlacingOrder(true);
          try {
            const verificationToken = await auth.currentUser?.getIdToken(true);
            if (!verificationToken) throw new Error('Please sign in again before verifying payment.');
            const verificationResult = await postPaymentApi<RazorpayVerificationResponse>(
              '/api/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              verificationToken,
            );
            resetAfterSuccess(verificationResult.order);
          } catch (error) {
            console.error('Failed to verify Razorpay payment', error);
            setCheckoutError('Payment was captured, but verification failed. Please contact support if the order is not visible.');
            setDraftOrderId('');
          } finally {
            setIsPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutError('Payment was cancelled before completion.');
            setDraftOrderId('');
            setIsPlacingOrder(false);
          },
        },
      });

      razorpay.on('payment.failed', (response: { error?: { description?: string } }) => {
        setCheckoutError(response.error?.description || 'Payment failed. Please try again.');
        setDraftOrderId('');
        setIsPlacingOrder(false);
      });

      setIsPlacingOrder(false);
      razorpay.open();
    } catch (error) {
      console.error('Failed to start online payment', error);
      const typedError = error as Error;
      setCheckoutError(typedError.message || 'Unable to start online payment right now. Please try again.');
      setDraftOrderId('');
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    const preparedOrder = await buildDraft();
    if (!preparedOrder) return;
    if (customerDetails.payment === 'Pay Online') {
      await startOnlinePayment(preparedOrder.order);
      return;
    }
    await placeCodOrder(preparedOrder.order);
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
    isPlacingOrder,
    draftOrderId,
    setDraftOrderId,
    savedAddressOptions,
    selectedAddressLabel,
    checkoutAddressSummary,
    isPayOnlineSelected,
    checkoutPrimaryActionLabel,
    hasCheckoutAddressSelectionRef,
    handleBrowseMenu,
    handleCaptureCustomerLocation,
    handlePlaceOrder,
  };
};
