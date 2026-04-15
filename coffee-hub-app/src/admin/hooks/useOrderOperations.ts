import { useCallback } from 'react';
import type { DeliveryAgent } from '../../types';
import type { Order } from '../types';
import {
  getNextOrderStatus,
  type OrderStatusCode,
} from '../types';
import {
  subscribeToAvailableDeliveryAgents,
  subscribeToAdminOrders,
  subscribeToKitchenOrders,
  subscribeToPendingOrders,
  updateAdminOrderStatus,
} from '../services/ordersService';

type DeliveryAgentAssignment = Pick<
  DeliveryAgent,
  'email' | 'id' | 'name' | 'phone' | 'vehicle_type'
>;

export const useOrderOperations = () => {
  const updateOrderStatus = useCallback(async (
    order: Order,
    statusCode: OrderStatusCode | string,
    options?: {
      assignedAgent?: DeliveryAgentAssignment | null;
      rejectionReason?: string;
    },
  ) => {
    await updateAdminOrderStatus({
      assignedAgent: options?.assignedAgent,
      order,
      nextStatus: statusCode,
      rejectionReason: options?.rejectionReason,
    });
  }, []);

  const acceptOrder = useCallback(async (order: Order) => {
    await updateOrderStatus(order, 'ACCEPTED');
  }, [updateOrderStatus]);

  const rejectOrder = useCallback(async (order: Order, reason: string) => {
    await updateOrderStatus(order, 'REJECTED', {
      rejectionReason: reason,
    });
  }, [updateOrderStatus]);

  const markPreparing = useCallback(async (order: Order) => {
    await updateOrderStatus(order, 'PREPARING');
  }, [updateOrderStatus]);

  const markOutForDelivery = useCallback(async (
    order: Order,
    assignedAgent: DeliveryAgentAssignment,
  ) => {
    await updateOrderStatus(order, 'OUT_FOR_DELIVERY', {
      assignedAgent,
    });
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
export {
  subscribeToAvailableDeliveryAgents,
  subscribeToKitchenOrders,
  subscribeToPendingOrders,
};
