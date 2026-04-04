import type {
  CheckoutOrderDraft,
  CreateOrderResponse,
  OrdersResponse,
} from '../../types';
import { getApi, postApi } from './apiClient';

export const createOrderRequest = (
  params: {
    orderDraft: CheckoutOrderDraft;
    role?: 'admin' | 'agent' | 'customer';
    userEmail?: string;
    userId: string;
  },
) => postApi<CreateOrderResponse>('/api/orders/create', params);

export const getOrdersRequest = (
  params: {
    userId: string;
    limit?: number;
    orderId?: string;
    status?: string;
  },
) => {
  const query = new URLSearchParams({
    scope: 'mine',
    userId: params.userId,
  });

  if (params.limit) {
    query.set('limit', String(params.limit));
  }

  if (params.orderId) {
    query.set('orderId', params.orderId);
  }

  if (params.status) {
    query.set('status', params.status);
  }

  return getApi<OrdersResponse>(`/api/orders?${query.toString()}`);
};
