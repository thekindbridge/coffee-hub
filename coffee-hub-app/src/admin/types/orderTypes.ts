export interface Order {
  id: string; // Human-friendly id, e.g. COF1001
  doc_id: string; // Firestore document id
  customer_name: string;
  phone: string;
  address: string;
  total_amount: number;
  subtotal?: number;
  discount?: number;
  delivery_fee?: number;
  coupon_code?: string;
  final_total?: number;
  status: OrderStatus;
  status_code: OrderStatusCode;
  rejection_reason?: string;
  cancellation_reason?: string;
  payment_method: string;
  payment_status?: OrderPaymentStatus;
  created_at: string;
  updated_at?: string;
  cancelled_at?: string;
  user_id: string;
  customer_location?: DeliveryLocation | null;
  delivery_location?: DeliveryLocation | null;
  delivery_agent_id?: string;
  delivery_agent_name?: string;
  delivery_agent_phone?: string;
  delivery_agent_email?: string;
  delivery_agent_vehicle?: string;
  delivery_assigned_at?: string;
  delivery_picked_at?: string;
  delivery_out_for_delivery_at?: string;
  delivery_delivered_at?: string;
  preparing_at?: string;
  ready_for_pickup_at?: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface DeliveryLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updated_at?: string;
}

export interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_type?: string;
  status?: DeliveryAgentStatus;
  is_active: boolean;
  current_order_id: string;
  current_location?: DeliveryLocation | null;
  last_location: DeliveryLocation | null;
}

export type OrderPaymentStatus = 'pending' | 'paid';
export type DeliveryAgentStatus = 'available' | 'offline' | 'busy';

export const ORDER_STATUS_DISPLAY = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
} as const;

export type OrderStatusCode = keyof typeof ORDER_STATUS_DISPLAY;
export type OrderStatus = (typeof ORDER_STATUS_DISPLAY)[OrderStatusCode];

export const ORDER_STATUS_FLOW: readonly OrderStatusCode[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatusCode, readonly OrderStatusCode[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

const LEGACY_STATUS_MAP: Record<string, OrderStatusCode> = {
  PENDING: 'PENDING',
  ACCEPT: 'ACCEPTED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'PREPARING',
  READY_FOR_PICKUP: 'PREPARING',
  OUTFORDELIVERY: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  ASSIGNED: 'OUT_FOR_DELIVERY',
  ASSIGNED_TO_AGENT: 'OUT_FOR_DELIVERY',
  ASSIGNED_TO_RIDER: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  CANCELED: 'CANCELLED',
};

const normalizeStatusKey = (value: string) => (
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
);

export const normalizeOrderStatusCode = (value: unknown): OrderStatusCode => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'PENDING';
  }

  const normalizedValue = normalizeStatusKey(value);
  return LEGACY_STATUS_MAP[normalizedValue] || 'PENDING';
};

export const mapStatusCodeToStatus = (statusCode: OrderStatusCode | string): OrderStatus => (
  ORDER_STATUS_DISPLAY[normalizeOrderStatusCode(statusCode)]
);

export const isTerminalOrderStatus = (statusCode: OrderStatusCode | string) => {
  const normalizedStatus = normalizeOrderStatusCode(statusCode);
  return (
    normalizedStatus === 'DELIVERED' ||
    normalizedStatus === 'REJECTED' ||
    normalizedStatus === 'CANCELLED'
  );
};

export const requiresRejectionReason = (statusCode: OrderStatusCode | string) => (
  normalizeOrderStatusCode(statusCode) === 'REJECTED'
);

export const isValidOrderStatusTransition = (
  currentStatus: OrderStatusCode | string,
  nextStatus: OrderStatusCode | string,
) => ORDER_STATUS_TRANSITIONS[normalizeOrderStatusCode(currentStatus)]
  .includes(normalizeOrderStatusCode(nextStatus));

export const getNextOrderStatus = (
  currentStatus: OrderStatusCode | string,
): OrderStatusCode | null => {
  const normalizedStatus = normalizeOrderStatusCode(currentStatus);

  switch (normalizedStatus) {
    case 'PENDING':
      return 'ACCEPTED';
    case 'ACCEPTED':
      return 'PREPARING';
    case 'PREPARING':
      return 'OUT_FOR_DELIVERY';
    case 'OUT_FOR_DELIVERY':
      return 'DELIVERED';
    default:
      return null;
  }
};

export const getOrderActionLabel = (statusCode: OrderStatusCode | string) => {
  const normalizedStatus = normalizeOrderStatusCode(statusCode);

  switch (normalizedStatus) {
    case 'PENDING':
      return 'Accept';
    case 'ACCEPTED':
      return 'Start Preparing';
    case 'PREPARING':
      return 'Mark Out for Delivery';
    case 'OUT_FOR_DELIVERY':
      return 'Mark Delivered';
    default:
      return '';
  }
};
