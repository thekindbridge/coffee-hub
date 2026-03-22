import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import type { Order } from '../../../types';
import {
  fetchOrderItemsMap,
  mapOrderDocToOrder,
} from '../lib/firestoreMappers';

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
  isDeliveryAgent: boolean,
  currentUserId: string,
): OrdersData => {
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [newOrderDocIds, setNewOrderDocIds] = useState<string[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isUserOrdersLoading, setIsUserOrdersLoading] = useState(false);

  const previousAdminOrderCountRef = useRef(0);
  const hasInitializedAdminOrdersRef = useRef(false);
  const orderAlertAudioRef = useRef<HTMLAudioElement | null>(null);
  const adminOrdersSnapshotVersionRef = useRef(0);
  const userOrdersSnapshotVersionRef = useRef(0);

  // --- Admin orders subscription ---
  useEffect(() => {
    const canAccessStaffOrders = isAdmin || isDeliveryAgent;
    if (!canAccessStaffOrders) {
      setAdminOrders([]);
      setNewOrderDocIds([]);
      previousAdminOrderCountRef.current = 0;
      hasInitializedAdminOrdersRef.current = false;
      adminOrdersSnapshotVersionRef.current = 0;
      return;
    }

    // Pre-load audio alert for admins
    if (isAdmin && !orderAlertAudioRef.current) {
      orderAlertAudioRef.current = new Audio('/order-alert.mp3');
      orderAlertAudioRef.current.preload = 'auto';
    }

    // Request notification permission on first load
    if (
      isAdmin &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      void Notification.requestPermission().catch(error => {
        console.error('Notification permission request failed', error);
      });
    }

    const highlightTimeoutIds: number[] = [];
    const unsubscribe = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      snapshot => {
        const mappedOrders = snapshot.docs.map(mapOrderDocToOrder);
        setAdminOrders(mappedOrders);

        const snapshotVersion = adminOrdersSnapshotVersionRef.current + 1;
        adminOrdersSnapshotVersionRef.current = snapshotVersion;

        // Hydrate items asynchronously
        void (async () => {
          try {
            const orderItemsMap = await fetchOrderItemsMap(mappedOrders.map(o => o.id));
            if (adminOrdersSnapshotVersionRef.current !== snapshotVersion) return;
            setAdminOrders(mappedOrders.map(order => ({
              ...order,
              items: orderItemsMap.get(order.id) || [],
            })));
          } catch (error) {
            console.error('Failed to load order items for admin orders', error);
          }
        })();

        if (!hasInitializedAdminOrdersRef.current) {
          previousAdminOrderCountRef.current = snapshot.size;
          hasInitializedAdminOrdersRef.current = true;
          return;
        }

        if (snapshot.size > previousAdminOrderCountRef.current) {
          const addedOrderDocIds = snapshot
            .docChanges()
            .filter(change => change.type === 'added')
            .map(change => change.doc.id);

          if (isAdmin && addedOrderDocIds.length > 0) {
            setNewOrderDocIds(prev => Array.from(new Set([...addedOrderDocIds, ...prev])));

            const timeoutId = window.setTimeout(() => {
              setNewOrderDocIds(prev => prev.filter(id => !addedOrderDocIds.includes(id)));
            }, 20000);
            highlightTimeoutIds.push(timeoutId);

            if (orderAlertAudioRef.current) {
              orderAlertAudioRef.current.currentTime = 0;
              void orderAlertAudioRef.current.play().catch(error => {
                console.error('Unable to play order alert sound', error);
              });
            }

            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('New Order Received', {
                body: 'A new order has been placed.',
                icon: '/logo.png',
              });
            }
          }
        }

        previousAdminOrderCountRef.current = snapshot.size;
      },
      error => {
        console.error('Failed to subscribe to admin orders', error);
      },
    );

    return () => {
      unsubscribe();
      highlightTimeoutIds.forEach(id => window.clearTimeout(id));
    };
  }, [isAdmin, isDeliveryAgent]);

  // --- User orders subscription ---
  useEffect(() => {
    if (!currentUserId) {
      setUserOrders([]);
      setIsUserOrdersLoading(false);
      userOrdersSnapshotVersionRef.current = 0;
      return;
    }

    setIsUserOrdersLoading(true);

    const buildQuery = (withOrderBy: boolean) => query(
      collection(db, 'orders'),
      where('userId', '==', currentUserId),
      ...(withOrderBy ? [orderBy('createdAt', 'desc')] : []),
    );

    let activeUnsubscribe: (() => void) | null = null;
    let hasFallbackQuery = false;

    const subscribeToUserOrders = (withOrderBy: boolean) => {
      activeUnsubscribe = onSnapshot(
        buildQuery(withOrderBy),
        snapshot => {
          const mappedOrders = snapshot.docs.map(mapOrderDocToOrder);
          const sortedOrders = withOrderBy
            ? mappedOrders
            : [...mappedOrders].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            );

          setUserOrders(sortedOrders);
          setIsUserOrdersLoading(false);

          const snapshotVersion = userOrdersSnapshotVersionRef.current + 1;
          userOrdersSnapshotVersionRef.current = snapshotVersion;

          void (async () => {
            try {
              const orderItemsMap = await fetchOrderItemsMap(sortedOrders.map(o => o.id));
              if (userOrdersSnapshotVersionRef.current !== snapshotVersion) return;
              setUserOrders(sortedOrders.map(order => ({
                ...order,
                items: orderItemsMap.get(order.id) || [],
              })));
            } catch (error) {
              console.error('Failed to load order items for user orders', error);
            }
          })();
        },
        error => {
          const shouldFallback = (
            withOrderBy &&
            !hasFallbackQuery &&
            error instanceof FirebaseError &&
            error.code === 'failed-precondition'
          );

          if (shouldFallback) {
            hasFallbackQuery = true;
            activeUnsubscribe?.();
            subscribeToUserOrders(false);
            return;
          }

          console.error('Failed to subscribe to user orders', error);
          setIsUserOrdersLoading(false);
        },
      );
    };

    subscribeToUserOrders(true);

    return () => {
      activeUnsubscribe?.();
    };
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
