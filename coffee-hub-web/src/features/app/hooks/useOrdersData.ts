import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Order } from '../../../types';
import {
  createBrowserAudio,
  playBrowserAudio,
} from '../../../services/browser/audioService';
import {
  getDesktopNotificationPermissionState,
  requestDesktopNotificationPermission,
  showDesktopNotification,
} from '../../../services/browser/desktopNotificationService';
import { fetchOrderItemsMap } from '../../../services/firebase/orderItemsService';
import {
  subscribeToAdminOrders,
  subscribeToUserOrders,
} from '../../../services/firebase/ordersRealtimeService';

export type OrdersData = {
  adminOrders: Order[];
  setAdminOrders: Dispatch<SetStateAction<Order[]>>;
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
  const [newOrderDocIds, setNewOrderDocIds] = useState<string[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isUserOrdersLoading, setIsUserOrdersLoading] = useState(false);

  const previousAdminOrderCountRef = useRef(0);
  const hasInitializedAdminOrdersRef = useRef(false);
  const orderAlertAudioRef = useRef<ReturnType<typeof createBrowserAudio>>(null);
  const adminOrdersSnapshotVersionRef = useRef(0);
  const userOrdersSnapshotVersionRef = useRef(0);

  // --- Admin orders subscription ---
  useEffect(() => {
    if (!isAdmin) {
      setAdminOrders([]);
      setNewOrderDocIds([]);
      previousAdminOrderCountRef.current = 0;
      hasInitializedAdminOrdersRef.current = false;
      adminOrdersSnapshotVersionRef.current = 0;
      return;
    }

    // Pre-load audio alert for admins
    if (!orderAlertAudioRef.current) {
      orderAlertAudioRef.current = createBrowserAudio('/order-alert.mp3');
    }

    if (getDesktopNotificationPermissionState() === 'default') {
      void requestDesktopNotificationPermission().catch(error => {
        console.error('Notification permission request failed', error);
      });
    }

    const highlightTimeoutIds: Array<ReturnType<typeof setTimeout>> = [];
    const unsubscribe = subscribeToAdminOrders(
      ({ addedOrderDocIds, orders, snapshotSize }) => {
        setAdminOrders(orders);

        const snapshotVersion = adminOrdersSnapshotVersionRef.current + 1;
        adminOrdersSnapshotVersionRef.current = snapshotVersion;

        // Hydrate items asynchronously
        void (async () => {
          try {
            const orderItemsMap = await fetchOrderItemsMap(orders.map(order => order.id));
            if (adminOrdersSnapshotVersionRef.current !== snapshotVersion) return;
            setAdminOrders(orders.map(order => ({
              ...order,
              items: orderItemsMap.get(order.id) || order.items || [],
            })));
          } catch (error) {
            console.error('Failed to load order items for admin orders', error);
          }
        })();

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
              void playBrowserAudio(orderAlertAudioRef.current).catch(error => {
                console.error('Unable to play order alert sound', error);
              });
            }

            showDesktopNotification({
              title: 'New Order Received',
              body: 'A new order has been placed.',
              icon: '/logo.png',
            });
          }
        }

        previousAdminOrderCountRef.current = snapshotSize;
      },
      error => {
        console.error('Failed to subscribe to admin orders', error);
      },
    );

    return () => {
      unsubscribe();
      highlightTimeoutIds.forEach(id => clearTimeout(id));
    };
  }, [isAdmin]);

  // --- User orders subscription ---
  useEffect(() => {
    if (!currentUserId) {
      setUserOrders([]);
      setIsUserOrdersLoading(false);
      userOrdersSnapshotVersionRef.current = 0;
      return;
    }

    setIsUserOrdersLoading(true);

    return subscribeToUserOrders(
      currentUserId,
      sortedOrders => {
        setUserOrders(sortedOrders);
        setIsUserOrdersLoading(false);

        const snapshotVersion = userOrdersSnapshotVersionRef.current + 1;
        userOrdersSnapshotVersionRef.current = snapshotVersion;

        void (async () => {
          try {
            const orderItemsMap = await fetchOrderItemsMap(sortedOrders.map(order => order.id));
            if (userOrdersSnapshotVersionRef.current !== snapshotVersion) return;
            setUserOrders(sortedOrders.map(order => ({
              ...order,
              items: orderItemsMap.get(order.id) || order.items || [],
            })));
          } catch (error) {
            console.error('Failed to load order items for user orders', error);
          }
        })();
      },
      error => {
        console.error('Failed to subscribe to user orders', error);
        setIsUserOrdersLoading(false);
      },
    );
  }, [currentUserId]);

  return {
    adminOrders,
    setAdminOrders,
    newOrderDocIds,
    setNewOrderDocIds,
    userOrders,
    setUserOrders,
    isUserOrdersLoading,
  };
};
