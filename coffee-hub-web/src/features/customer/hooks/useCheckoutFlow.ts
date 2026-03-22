import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { calculateDiscount } from '../../../utils/calculateDiscount';
import { loadRazorpayCheckout } from '../../../utils/loadRazorpayCheckout';
import { postPaymentApi } from '../../../utils/paymentApi';
import type {
  CartItem,
  CheckoutCustomerDetails,
  CheckoutOrderDraft,
  CheckoutOrderItemPayload,
  MenuItem,
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [customerDetails, setCustomerDetails] = useState<CheckoutCustomerDetails>({
    name: '',
    phone: '',
    address: '',
    location: null,
    payment: 'Pay Online',
  });
  const [selectedAddressIndex, setSelectedAddressIndex] =
    useState<SelectedAddressIndex>('new');
  const [isCheckoutAddressListOpen, setIsCheckoutAddressListOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
  const [customerLocationError, setCustomerLocationError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [draftOrderId, setDraftOrderId] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCouponAppliedPulseVisible, setIsCouponAppliedPulseVisible] =
    useState(false);
  const hasCheckoutAddressSelectionRef = useRef(false);

  const hasCartItems = cart.length > 0;
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartQuantityById = useMemo(
    () => new Map(cart.map(item => [item.id, item.quantity])),
    [cart],
  );
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
    savedAddressOptions.find(option => option.index === 0) ||
    savedAddressOptions[0] ||
    null;
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

  const { discount: discountAmount, finalTotal: finalCartTotal } = useMemo(() => {
    if (!appliedOffer || cartTotal < appliedOffer.minOrderAmount) {
      return { discount: 0, finalTotal: cartTotal };
    }

    return calculateDiscount(cartTotal, appliedOffer);
  }, [appliedOffer, cartTotal]);
  const deliveryFee = useMemo(() => (hasCartItems ? STANDARD_DELIVERY_FEE : 0), [
    hasCartItems,
  ]);
  const payableCartTotal = useMemo(
    () => Number((finalCartTotal + deliveryFee).toFixed(2)),
    [deliveryFee, finalCartTotal],
  );
  const isPayOnlineSelected = customerDetails.payment === 'Pay Online';
  const checkoutPrimaryActionLabel = isPlacingOrder
    ? (isPayOnlineSelected ? 'Opening payment...' : 'Placing order...')
    : (isPayOnlineSelected ? 'Pay online' : 'Confirm order');

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
      if (prev === 'new') {
        return prev;
      }
      const stillExists = savedAddressOptions.some(option => option.index === prev);
      return stillExists ? prev : savedAddressOptions[0].index;
    });
  }, [savedAddressOptions]);

  useEffect(() => {
    if (selectedAddressIndex === 'new') {
      return;
    }

    const selectedAddress = profileSaved.addresses[selectedAddressIndex] || '';
    setCustomerDetails(prev => (
      prev.address === selectedAddress ? prev : { ...prev, address: selectedAddress }
    ));
  }, [profileSaved.addresses, selectedAddressIndex]);

  useEffect(() => {
    if (!profileSaved.name && !profileSaved.phone) {
      return;
    }

    setCustomerDetails(prev => ({
      ...prev,
      name: prev.name || profileSaved.name,
      phone: prev.phone || profileSaved.phone,
    }));
  }, [profileSaved.name, profileSaved.phone]);

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
      .catch(error => {
        console.error('Failed to validate coupon', error);
      });
  }, [appliedCouponCode, cartTotal, findActiveOfferByCode]);

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
    if (cart.length > 0 || checkoutStep === 'success') {
      return;
    }

    setCheckoutStep('cart');
    setDraftOrderId('');
    setCheckoutError('');
  }, [cart.length, checkoutStep]);

  useEffect(() => {
    if (!isCouponAppliedPulseVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsCouponAppliedPulseVisible(false);
    }, 650);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCouponAppliedPulseVisible]);

  const handleAddToCart = (item: MenuItem, delta: number) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        const newQuantity = existing.quantity + delta;
        if (newQuantity <= 0) {
          return prev.filter(cartItem => cartItem.id !== item.id);
        }
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: newQuantity }
            : cartItem,
        );
      }

      if (delta > 0) {
        return [...prev, { ...item, quantity: 1 }];
      }

      return prev;
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
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

  const handleApplyCoupon = async () => {
    const normalizedCouponCode = couponInput.trim().toUpperCase();
    if (!normalizedCouponCode) {
      setCouponError('Enter a coupon code.');
      setCouponSuccess('');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const matchingOffer = await findActiveOfferByCode(normalizedCouponCode);
      if (!matchingOffer) {
        setAppliedCouponCode('');
        setAppliedOffer(null);
        setCouponError('Invalid coupon code.');
        return;
      }

      if (cartTotal < matchingOffer.minOrderAmount) {
        setAppliedCouponCode('');
        setAppliedOffer(null);
        setCouponError(
          `Minimum order amount is ${CURRENCY_SYMBOL}${matchingOffer.minOrderAmount}.`,
        );
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
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        },
      );
    });

  const captureCustomerLocation = async () => {
    setIsLocatingCustomer(true);
    setCustomerLocationError('');
    setCheckoutError('');

    try {
      const nextLocation = await getCurrentBrowserLocation();
      setCustomerDetails(prev => ({
        ...prev,
        location: nextLocation,
      }));
      return nextLocation;
    } catch (error) {
      console.error('Failed to capture customer location', error);
      setCustomerLocationError(
        error instanceof Error
          ? error.message
          : 'Unable to capture your location right now.',
      );
      return null;
    } finally {
      setIsLocatingCustomer(false);
    }
  };

  const handleCaptureCustomerLocation = async () => {
    await captureCustomerLocation();
  };

  const getNextOrderId = async () => {
    const counterRef = doc(db, 'meta', 'orderCounter');
    const nextNumber = await runTransaction(db, async transaction => {
      const counterSnapshot = await transaction.get(counterRef);
      const currentValue = counterSnapshot.exists() && typeof counterSnapshot.data().nextOrderNumber === 'number'
        ? counterSnapshot.data().nextOrderNumber
        : 1001;

      transaction.set(counterRef, { nextOrderNumber: currentValue + 1 }, { merge: true });
      return currentValue;
    });

    return `COF${String(nextNumber).padStart(4, '0')}`;
  };

  const resetCheckoutAfterSuccess = (nextOrder: Order) => {
    onOrderPlaced(nextOrder);
    setCheckoutStep('success');
    setCart([]);
    setDraftOrderId('');
    setAppliedCouponCode('');
    setAppliedOffer(null);
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
    setCheckoutError('');
  };

  const buildCheckoutDraft = async () => {
    const name = customerDetails.name.trim();
    const phone = customerDetails.phone.trim();
    const address = customerDetails.address.trim();
    let customerLocation = customerDetails.location;

    if (!name || !phone || !address) {
      setCheckoutError('Please fill in your name, phone number, and delivery address.');
      return null;
    }

    if (!customerLocation) {
      const capturedLocation = await captureCustomerLocation();
      if (!capturedLocation) {
        setCheckoutError('Share your live delivery location to enable rider tracking and ETA updates.');
        return null;
      }
      customerLocation = capturedLocation;
    }

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return null;
    }

    if (!currentUserId) {
      setCheckoutError('Please sign in with Google to place an order.');
      return null;
    }

    const subtotalValue = cartTotal;
    const deliveryFeeValue = hasCartItems ? STANDARD_DELIVERY_FEE : 0;
    let discountValue = 0;
    let discountedSubtotalValue = subtotalValue;
    let couponCodeValue = '';

    if (appliedCouponCode) {
      const matchingOffer = await findActiveOfferByCode(appliedCouponCode);
      if (matchingOffer && subtotalValue >= matchingOffer.minOrderAmount) {
        const recalculated = calculateDiscount(subtotalValue, matchingOffer);
        discountValue = recalculated.discount;
        discountedSubtotalValue = recalculated.finalTotal;
        couponCodeValue = matchingOffer.couponCode;
        setAppliedOffer(matchingOffer);
      } else {
        setAppliedCouponCode('');
        setAppliedOffer(null);
        setCouponSuccess('');
        setCouponError('Coupon was removed because it is no longer valid.');
      }
    }

    const finalTotalValue = Number((discountedSubtotalValue + deliveryFeeValue).toFixed(2));
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
        customer: {
          name,
          phone,
          address,
          location: customerLocation,
        },
        items,
        subtotal: subtotalValue,
        discount: discountValue,
        deliveryFee: deliveryFeeValue,
        couponCode: couponCodeValue,
        finalTotal: finalTotalValue,
      } satisfies CheckoutOrderDraft,
    };
  };

  const placeCashOnDeliveryOrder = async (draft: CheckoutOrderDraft) => {
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
        const orderItemRef = doc(collection(db, 'order_items'));
        batch.set(orderItemRef, {
          orderId: draft.orderId,
          orderDocId: orderRef.id,
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        });
      }

      await batch.commit();

      resetCheckoutAfterSuccess(buildLocalOrderState({
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

      const didLoadScript = await loadRazorpayCheckout();
      if (!didLoadScript || !window.Razorpay) {
        setCheckoutError('Unable to load Razorpay checkout right now. Please try again.');
        setDraftOrderId('');
        setIsPlacingOrder(false);
        return;
      }

      const paymentOrder = await postPaymentApi<RazorpayOrderResponse>(
        '/api/create-order',
        {
          orderDraft: draft,
          userId: currentUserId,
        },
        idToken,
      );

      const razorpay = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Coffee HUB',
        description: 'Food Order Payment',
        order_id: paymentOrder.razorpayOrderId,
        prefill: {
          name: draft.customer.name,
          email: currentUserEmail,
          contact: draft.customer.phone,
        },
        notes: {
          orderId: draft.orderId,
        },
        theme: {
          color: '#8b4a20',
        },
        handler: async response => {
          setIsPlacingOrder(true);

          try {
            const verificationToken = await auth.currentUser?.getIdToken(true);
            if (!verificationToken) {
              throw new Error('Please sign in again before verifying payment.');
            }

            const verificationResult = await postPaymentApi<RazorpayVerificationResponse>(
              '/api/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              verificationToken,
            );

            resetCheckoutAfterSuccess(verificationResult.order);
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

      razorpay.on('payment.failed', response => {
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
    const preparedOrder = await buildCheckoutDraft();
    if (!preparedOrder) {
      return;
    }

    if (customerDetails.payment === 'Pay Online') {
      await startOnlinePayment(preparedOrder.order);
      return;
    }

    await placeCashOnDeliveryOrder(preparedOrder.order);
  };

  return {
    cart,
    setCart,
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
    couponInput,
    setCouponInput,
    appliedCouponCode,
    setAppliedCouponCode,
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
    savedAddressOptions,
    selectedAddressLabel,
    checkoutAddressSummary,
    discountAmount,
    deliveryFee,
    payableCartTotal,
    checkoutPrimaryActionLabel,
    handleAddToCart,
    handleRemoveFromCart,
    handleBrowseMenu,
    handleApplyCoupon,
    handleRemoveCoupon,
    handleCaptureCustomerLocation,
    handlePlaceOrder,
    hasCheckoutAddressSelectionRef,
  };
};
