import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Order } from '../../../types';
import type { AudioHandle } from '../../../services/platform/audioAdapter';
import { audioAdapter } from '../../../services/platform/audioAdapter';
import { notificationAdapter } from '../../../services/platform/notificationAdapter';
import {
  subscribeToAdminOrders,
  subscribeToUserOrders,
} from '../../../services/firebase/ordersRealtimeService';

export type OrdersData = {
  adminOrders: Order[];
  setAdminOrders: Dispatch<SetStateAction<Order[]>>;
  isAdminOrdersLoading: boolean;
  newOrderDocIds: string[];
  setNewOrderDocIds: Dispatch<SetStateAction<string[]>>;
  userOrders: Order[];
  setUserOrders: Dispatch<SetStateAction<Order[]>>;
  isUserOrdersLoading: boolean;
};

/**
 * Manages real-time subscriptions to admin orders and user orders.
 * Handles order item hydration, new-order alerts (audio + notification),
 * and Firebase index fallback for user orders.
 */
export const useOrdersData = (
  isAdmin: boolean,
  currentUserId: string,
): OrdersData => {
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [isAdminOrdersLoading, setIsAdminOrdersLoading] = useState(false);
  const [newOrderDocIds, setNewOrderDocIds] = useState<string[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isUserOrdersLoading, setIsUserOrdersLoading] = useState(false);

  const previousAdminOrderCountRef = useRef(0);
  const hasInitializedAdminOrdersRef = useRef(false);
  const orderAlertAudioRef = useRef<AudioHandle | null>(null);
  // --- Admin orders subscription ---
  useEffect(() => {
    if (!isAdmin) {
      setAdminOrders([]);
      setIsAdminOrdersLoading(false);
      setNewOrderDocIds([]);
      previousAdminOrderCountRef.current = 0;
      hasInitializedAdminOrdersRef.current = false;
      return;
    }

    setIsAdminOrdersLoading(true);

    // Pre-load audio alert for admins
    if (!orderAlertAudioRef.current) {
      orderAlertAudioRef.current = audioAdapter.create('/order-alert.mp3');
    }

    if (notificationAdapter.getPermissionState() === 'default') {
      void notificationAdapter.requestPermission().catch(() => undefined);
    }

    const highlightTimeoutIds: Array<ReturnType<typeof setTimeout>> = [];
    const unsubscribe = subscribeToAdminOrders(
      ({ addedOrderDocIds, orders, snapshotSize }) => {
        setAdminOrders(orders);
        setIsAdminOrdersLoading(false);

        if (!hasInitializedAdminOrdersRef.current) {
          previousAdminOrderCountRef.current = snapshotSize;
          hasInitializedAdminOrdersRef.current = true;
          return;
        }

        if (snapshotSize > previousAdminOrderCountRef.current && addedOrderDocIds.length > 0) {
          if (isAdmin) {
            setNewOrderDocIds(prev => Array.from(new Set([...addedOrderDocIds, ...prev])));

            const timeoutId = setTimeout(() => {
              setNewOrderDocIds(prev => prev.filter(id => !addedOrderDocIds.includes(id)));
            }, 20000);
            highlightTimeoutIds.push(timeoutId);

            if (orderAlertAudioRef.current) {
              void orderAlertAudioRef.current.play().catch(() => undefined);
            }

            notificationAdapter.show({
              title: 'New Order Received',
              body: 'A new order has been placed.',
              icon: '/logo.png',
            });
          }
        }

        previousAdminOrderCountRef.current = snapshotSize;
      },
      () => {
        setIsAdminOrdersLoading(false);
      },
    );

    return () => {
      unsubscribe();
      highlightTimeoutIds.forEach(id => clearTimeout(id));
    };
  }, [isAdmin]);

  useEffect(() => () => {
    orderAlertAudioRef.current?.dispose?.();
    orderAlertAudioRef.current = null;
  }, []);

  // --- User orders subscription ---
  useEffect(() => {
    if (!currentUserId) {
      setUserOrders([]);
      setIsUserOrdersLoading(false);
      return;
    }

    setIsUserOrdersLoading(true);

    return subscribeToUserOrders(
      currentUserId,
      sortedOrders => {
        setUserOrders(sortedOrders);
        setIsUserOrdersLoading(false);
      },
      () => {
        setIsUserOrdersLoading(false);
      },
    );
  }, [currentUserId]);

  return {
    adminOrders,
    setAdminOrders,
    isAdminOrdersLoading,
    newOrderDocIds,
    setNewOrderDocIds,
    userOrders,
    setUserOrders,
    isUserOrdersLoading,
  };
};
