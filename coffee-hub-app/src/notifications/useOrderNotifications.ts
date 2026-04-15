import { useEffect, useRef } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { normalizeOrderStatusCode, type OrderStatusCode } from '../shared/orderStatus';
import type { Order } from '../types';
import {
  cleanupNotificationSoundAsync,
  playNotificationSoundAsync,
} from './notificationService';

const ORDER_UPDATE_ALERT_TITLE = 'Order Update';

const ORDER_STATUS_MESSAGES = {
  'PENDING->ACCEPTED': 'Your order is accepted \u2615',
  'PENDING->REJECTED': 'Your order was rejected \u274c',
  'ACCEPTED->OUT_FOR_DELIVERY': 'Your order is out for delivery \u{1F69A}',
  'OUT_FOR_DELIVERY->DELIVERED': 'Order delivered successfully \u2705',
} as const;

type UseOrderNotificationsOptions = {
  currentUserId?: string;
  enabled?: boolean;
  isLoading?: boolean;
};

const getOrderKey = (order: Order) => order.doc_id || order.id;

const buildOrderStatusMap = (orders: Order[]) => {
  const statusMap = new Map<string, OrderStatusCode>();

  for (const order of orders) {
    statusMap.set(
      getOrderKey(order),
      normalizeOrderStatusCode(order.status_code),
    );
  }

  return statusMap;
};

const getOrderStatusMessage = (
  previousStatus: OrderStatusCode,
  nextStatus: OrderStatusCode,
) => ORDER_STATUS_MESSAGES[
  `${previousStatus}->${nextStatus}` as keyof typeof ORDER_STATUS_MESSAGES
] || null;

const showOrderStatusMessage = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert(ORDER_UPDATE_ALERT_TITLE, message);
};

export const useOrderNotifications = (
  orders: Order[],
  options: UseOrderNotificationsOptions = {},
) => {
  const {
    currentUserId = '',
    enabled = true,
    isLoading = false,
  } = options;
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const notificationSessionRef = useRef(0);
  const previousStatusesRef = useRef<Map<string, OrderStatusCode>>(new Map());
  const notificationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestEnabledRef = useRef(enabled);

  latestEnabledRef.current = enabled;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      notificationSessionRef.current += 1;
      void cleanupNotificationSoundAsync();
    };
  }, []);

  useEffect(() => {
    notificationSessionRef.current += 1;
    previousStatusesRef.current = new Map();
    hasInitializedRef.current = false;
  }, [currentUserId]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      if (isLoading) {
        return;
      }

      previousStatusesRef.current = buildOrderStatusMap(orders);
      hasInitializedRef.current = true;
      return;
    }

    const nextStatuses = buildOrderStatusMap(orders);
    const messagesToNotify: string[] = [];

    for (const order of orders) {
      const orderKey = getOrderKey(order);
      const previousStatus = previousStatusesRef.current.get(orderKey);
      const nextStatus = nextStatuses.get(orderKey);

      if (!previousStatus || !nextStatus || previousStatus === nextStatus) {
        continue;
      }

      const statusMessage = getOrderStatusMessage(previousStatus, nextStatus);
      if (statusMessage) {
        messagesToNotify.push(statusMessage);
      }
    }

    previousStatusesRef.current = nextStatuses;

    if (!enabled || messagesToNotify.length === 0) {
      return;
    }

    for (const message of messagesToNotify) {
      const notificationSession = notificationSessionRef.current;

      notificationQueueRef.current = notificationQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (
            !isMountedRef.current ||
            !latestEnabledRef.current ||
            notificationSession !== notificationSessionRef.current
          ) {
            return;
          }

          const playbackPromise = playNotificationSoundAsync();
          showOrderStatusMessage(message);
          await playbackPromise;
        });
    }
  }, [enabled, isLoading, orders]);
};
