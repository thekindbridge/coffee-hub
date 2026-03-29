import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { MenuItem, Offer, Order, ShopTiming } from '../../../types';
import type { CustomerProfile } from '../../app/types';
import type { CustomerTab } from '../../../constants/routes';
import { buildShopAvailabilityMessage } from '../../../../shared/shopTiming';
import { urlStateAdapter } from '../../../services/platform/urlStateAdapter';
import { useCheckoutFlow } from './useCheckoutFlow';

type UseCustomerExperienceParams = {
  currentUserId: string;
  findActiveOfferByCode: (couponCode: string) => Promise<Offer | null>;
  isShopTimingLoading: boolean;
  isUserOrdersLoading: boolean;
  menu: MenuItem[];
  orderStatus: Order | null;
  profileSaved: CustomerProfile;
  setOrderStatus: Dispatch<SetStateAction<Order | null>>;
  shopTiming: ShopTiming;
  userOrders: Order[];
};

export const useCustomerExperience = ({
  currentUserId,
  findActiveOfferByCode,
  isShopTimingLoading,
  isUserOrdersLoading,
  menu,
  orderStatus,
  profileSaved,
  setOrderStatus,
  shopTiming,
  userOrders,
}: UseCustomerExperienceParams) => {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [isTrackingOrder, setIsTrackingOrder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const checkout = useCheckoutFlow({
    currentUserId,
    profileSaved,
    shopTiming,
    findActiveOfferByCode,
    onBrowseMenu: () => setActiveTab('menu'),
    onOrderPlaced: nextOrder => {
      setOrderStatus(nextOrder);
      setTrackingOrderId(nextOrder.id);
    },
  });

  useEffect(() => {
    if (!orderStatus) {
      return;
    }

    const syncedOrder = userOrders.find(order => order.id === orderStatus.id);
    if (!syncedOrder) {
      return;
    }

    setOrderStatus(previousOrder => {
      if (!previousOrder || previousOrder.id !== syncedOrder.id) {
        return previousOrder;
      }

      const mergedItems =
        syncedOrder.items && syncedOrder.items.length > 0 ? syncedOrder.items : previousOrder.items;
      const isSameOrder =
        previousOrder.status === syncedOrder.status &&
        previousOrder.status_code === syncedOrder.status_code &&
        previousOrder.total_amount === syncedOrder.total_amount &&
        previousOrder.address === syncedOrder.address &&
        previousOrder.rejection_reason === syncedOrder.rejection_reason &&
        previousOrder.cancellation_reason === syncedOrder.cancellation_reason &&
        previousOrder.customer_location?.lat === syncedOrder.customer_location?.lat &&
        previousOrder.customer_location?.lng === syncedOrder.customer_location?.lng &&
        previousOrder.items === mergedItems;

      if (isSameOrder) {
        return previousOrder;
      }

      return { ...syncedOrder, items: mergedItems };
    });
  }, [orderStatus, setOrderStatus, userOrders]);

  useEffect(() => {
    if (checkout.checkoutStep !== 'success' || !orderStatus) {
      return;
    }

    const timeoutId = setTimeout(() => {
      checkout.setIsCartOpen(false);
      checkout.setCheckoutStep('cart');
      setActiveTab('tracking');
      checkout.setDraftOrderId('');
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [
    checkout.checkoutStep,
    checkout.setCheckoutStep,
    checkout.setDraftOrderId,
    checkout.setIsCartOpen,
    orderStatus,
  ]);

  useEffect(() => {
    const requestedRoute = urlStateAdapter.getRequestedCustomerRoute();

    if (requestedRoute.tab === 'tracking' && requestedRoute.orderId) {
      if (isUserOrdersLoading) {
        return;
      }

      const matchedOrder = userOrders.find(order => order.id === requestedRoute.orderId) || null;
      setActiveTab('tracking');
      setTrackingOrderId(requestedRoute.orderId);
      setOrderStatus(matchedOrder);
      setTrackingError(matchedOrder ? '' : 'Order not found. Please check the ID.');
      urlStateAdapter.clearRequestedCustomerRoute();
      return;
    }

    if (requestedRoute.tab === 'orders') {
      setActiveTab('orders');
      urlStateAdapter.clearRequestedCustomerRoute();
    }
  }, [isUserOrdersLoading, setOrderStatus, userOrders]);

  const categories = useMemo(
    () => ['All', ...new Set(menu.map(item => item.category))],
    [menu],
  );

  const filteredMenu = useMemo(
    () => menu.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(deferredSearchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }),
    [deferredSearchQuery, menu, selectedCategory],
  );

  const shopAvailabilityMessage = useMemo(
    () => buildShopAvailabilityMessage(shopTiming.openTime),
    [shopTiming.openTime],
  );

  const shouldShowShopClosedBanner = !isShopTimingLoading && !checkout.isShopOpen;
  const isCartFloatingVisible = checkout.cartCount > 0 && activeTab !== 'tracking';

  const handleTrackOrderLookup = useCallback(() => {
    const orderId = trackingOrderId.trim().toUpperCase();
    if (!orderId) {
      setTrackingError('Enter your order ID to track it.');
      return;
    }

    setTrackingError('');
    setIsTrackingOrder(true);
    const matchedOrder = userOrders.find(order => order.id === orderId);
    if (!matchedOrder) {
      setOrderStatus(null);
      setTrackingError('Order not found. Please check the ID.');
      setIsTrackingOrder(false);
      return;
    }

    setOrderStatus(matchedOrder);
    setTrackingOrderId(matchedOrder.id);
    setIsTrackingOrder(false);
  }, [trackingOrderId, userOrders, setOrderStatus]);

  const handleTrackFromOrder = useCallback((order: Order) => {
    setTrackingError('');
    setIsTrackingOrder(false);
    setTrackingOrderId(order.id);
    setOrderStatus(order);
    setActiveTab('tracking');
  }, [setOrderStatus]);

  const clearTracking = useCallback(() => {
    setOrderStatus(null);
    setTrackingError('');
  }, [setOrderStatus]);

  return {
    activeTab,
    categories,
    checkout,
    clearTracking,
    filteredMenu,
    handleTrackFromOrder,
    handleTrackOrderLookup,
    isCartFloatingVisible,
    isTrackingOrder,
    searchQuery,
    selectedCategory,
    setActiveTab,
    setSearchQuery,
    setSelectedCategory,
    setTrackingOrderId,
    shopAvailabilityMessage,
    shouldShowShopClosedBanner,
    trackingError,
    trackingOrderId,
  };
};
