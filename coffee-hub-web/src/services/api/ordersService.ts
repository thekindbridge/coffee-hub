import type {
  CheckoutOrderDraft,
  CreateOrderResponse,
  DeliveryLocation,
  OrderStatusCode,
  UpdateOrderStatusResponse,
} from '../../types';
import { postApi, putApi } from './apiClient';

export const createOrderRequest = (
  params: {
    orderDraft: CheckoutOrderDraft;
  },
  idToken: string,
) => postApi<CreateOrderResponse>('/api/orders', params, idToken);

export const updateOrderStatusRequest = (
  params: {
    orderId: string;
    status: OrderStatusCode;
    rejectionReason?: string;
  },
  idToken: string,
) => putApi<UpdateOrderStatusResponse>('/api/orders?action=update-status', params, idToken);

export const assignAgentToOrderRequest = (
  params: {
    orderId: string;
    agentId: string;
  },
  idToken: string,
) => putApi<UpdateOrderStatusResponse>('/api/orders?action=assign-agent', params, idToken);

export const cancelOrderRequest = (
  params: {
    cancellationReason: string;
    orderId: string;
  },
  idToken: string,
) => putApi<UpdateOrderStatusResponse>('/api/orders?action=cancel', params, idToken);

export const completeDeliveryRequest = (
  params: {
    orderId: string;
    finalLocation: DeliveryLocation | null;
  },
  idToken: string,
) => putApi<UpdateOrderStatusResponse>('/api/orders?action=complete-delivery', params, idToken);

export const updateDeliveryTrackingRequest = (
  params: {
    orderDocId: string;
    orderId: string;
    agentId: string;
    agentName?: string;
    customerLocation?: DeliveryLocation | null;
    location?: DeliveryLocation | null;
  },
  idToken: string,
) => putApi<{ success: true }>('/api/orders?action=update-delivery-tracking', params, idToken);
