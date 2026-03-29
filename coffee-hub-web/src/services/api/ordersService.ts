import type {
  CheckoutOrderDraft,
  CreateOrderResponse,
  DeliveryLocation,
  OrderStatusCode,
  UpdateOrderStatusResponse,
} from '../../types';
import { postApi } from './apiClient';

export const createOrderRequest = (
  params: {
    orderDraft: CheckoutOrderDraft;
    userId: string;
  },
  idToken: string,
) => postApi<CreateOrderResponse>('/api/orders/create', params, idToken);

export const updateOrderStatusRequest = (
  params: {
    orderId: string;
    status: OrderStatusCode;
    rejectionReason?: string;
  },
  idToken: string,
) => postApi<UpdateOrderStatusResponse>('/api/orders/update-status', params, idToken);

export const assignAgentToOrderRequest = (
  params: {
    orderId: string;
    agentId: string;
  },
  idToken: string,
) => postApi<UpdateOrderStatusResponse>('/api/orders/assign-agent', params, idToken);

export const cancelOrderRequest = (
  params: {
    cancellationReason: string;
    orderId: string;
  },
  idToken: string,
) => postApi<UpdateOrderStatusResponse>('/api/orders/cancel', params, idToken);

export const completeDeliveryRequest = (
  params: {
    orderId: string;
    finalLocation: DeliveryLocation | null;
  },
  idToken: string,
) => postApi<UpdateOrderStatusResponse>('/api/orders/complete-delivery', params, idToken);
