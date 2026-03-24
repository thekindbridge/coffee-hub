import { env } from '../config/env';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string;
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  spice_level: number;
  is_veg: boolean;
  rating: number;
  image_url: string;
  description: string;
  is_available: boolean;
};

type MenuResponse = {
  menu: MenuItem[];
};

export type CreateOrderInput = {
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  paymentMethod: 'cash' | 'razorpay';
};

export type OrderSummary = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = typeof payload?.error === 'string' ? payload.error : 'Request failed.';
    throw new Error(errorMessage);
  }

  return payload as TResponse;
}

export async function getMenu() {
  const payload = await request<MenuResponse | MenuItem[]>('/api/menu');

  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload.menu) ? payload.menu : [];
}

export function createOrder(payload: CreateOrderInput, token?: string) {
  return request<OrderSummary>('/api/orders/create', {
    body: payload,
    method: 'POST',
    token,
  });
}

export function getOrders(token?: string) {
  return request<OrderSummary[]>('/api/orders', {
    token,
  });
}
