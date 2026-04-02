import { useCallback } from 'react';
import type { Order } from '../types';
import {
  getNextOrderStatus,
  type OrderStatusCode,
} from '../types';
import {
  subscribeToAdminOrders,
  updateAdminOrderStatus,
} from '../services/ordersService';

export const useOrderOperations = () => {
  const updateOrderStatus = useCallback(async (
    order: Order,
    statusCode: OrderStatusCode | string,
    rejectionReason?: string,
  ) => {
    await updateAdminOrderStatus({
      order,
      nextStatus: statusCode,
      rejectionReason,
    });
  }, []);

  const acceptOrder = useCallback(async (order: Order) => {
    await updateOrderStatus(order, 'ACCEPTED');
  }, [updateOrderStatus]);

  const rejectOrder = useCallback(async (order: Order, reason: string) => {
    await updateOrderStatus(order, 'REJECTED', reason);
  }, [updateOrderStatus]);

  const markPreparing = useCallback(async (order: Order) => {
    await updateOrderStatus(order, 'PREPARING');
  }, [updateOrderStatus]);

  const markOutForDelivery = useCallback(async (order: Order) => {
    await updateOrderStatus(order, 'OUT_FOR_DELIVERY');
  }, [updateOrderStatus]);

  const markDelivered = useCallback(async (order: Order) => {
    await updateOrderStatus(order, 'DELIVERED');
  }, [updateOrderStatus]);

  const advanceOrder = useCallback(async (order: Order) => {
    const nextStatus = getNextOrderStatus(order.status_code);
    if (!nextStatus) {
      return;
    }

    await updateOrderStatus(order, nextStatus);
  }, [updateOrderStatus]);

  return {
    updateOrderStatus,
    acceptOrder,
    rejectOrder,
    markPreparing,
    markOutForDelivery,
    markDelivered,
    advanceOrder,
  };
};

export { subscribeToAdminOrders };
