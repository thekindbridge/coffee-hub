import type {
  CheckoutOrderDraft,
  CreateOrderResponse,
  OrdersResponse,
} from '../../types';
import { getApi, postApi } from './apiClient';

export const createOrderRequest = (
  params: {
    orderDraft: CheckoutOrderDraft;
    userId: string;
  },
  idToken: string,
) => postApi<CreateOrderResponse>('/api/orders/create', params, idToken);

export const getOrdersRequest = (
  params: {
    userId: string;
    limit?: number;
    orderId?: string;
    status?: string;
  },
  idToken: string,
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

  return getApi<OrdersResponse>(`/api/orders?${query.toString()}`, idToken);
};
