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

export const ORDER_STATUS_PROGRESS_FLOW: readonly OrderStatusCode[] = [
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

export const ORDER_STATUS_CUSTOMER_COPY: Record<OrderStatusCode, string> = {
  PENDING: 'Waiting for confirmation.',
  ACCEPTED: 'Order accepted.',
  PREPARING: 'Preparing your order.',
  OUT_FOR_DELIVERY: 'On the way.',
  DELIVERED: 'Delivered.',
  REJECTED: 'Order rejected.',
  CANCELLED: 'Order cancelled.',
};

const LEGACY_STATUS_MAP: Record<string, OrderStatusCode> = {
  PLACED: 'PENDING',
  PENDING: 'PENDING',
  ACCEPT: 'ACCEPTED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'PREPARING',
  READY_FOR_PICKUP: 'PREPARING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  OUTFORDELIVERY: 'OUT_FOR_DELIVERY',
  ASSIGNED: 'OUT_FOR_DELIVERY',
  ASSIGNED_TO_AGENT: 'OUT_FOR_DELIVERY',
  ASSIGNED_TO_RIDER: 'OUT_FOR_DELIVERY',
  PICKED: 'OUT_FOR_DELIVERY',
  PICKED_UP: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  CANCELED: 'CANCELLED',
};

const normalizeStatusKey = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

export const normalizeOrderStatusCode = (value: unknown): OrderStatusCode => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'PENDING';
  }

  const normalized = normalizeStatusKey(value);
  return LEGACY_STATUS_MAP[normalized] || 'PENDING';
};

export const getOrderStatusLabel = (value: OrderStatusCode | string): OrderStatus =>
  ORDER_STATUS_DISPLAY[normalizeOrderStatusCode(value)];

export const getOrderStatusCustomerCopy = (value: OrderStatusCode | string) =>
  ORDER_STATUS_CUSTOMER_COPY[normalizeOrderStatusCode(value)];

export const getAllowedNextOrderStatuses = (value: OrderStatusCode | string) =>
  ORDER_STATUS_TRANSITIONS[normalizeOrderStatusCode(value)];

export const isValidOrderStatusTransition = (
  currentStatus: OrderStatusCode | string,
  nextStatus: OrderStatusCode | string,
) =>
  getAllowedNextOrderStatuses(currentStatus).includes(normalizeOrderStatusCode(nextStatus));

export const isTerminalOrderStatus = (value: OrderStatusCode | string) => {
  const normalizedStatus = normalizeOrderStatusCode(value);
  return (
    normalizedStatus === 'DELIVERED' ||
    normalizedStatus === 'REJECTED' ||
    normalizedStatus === 'CANCELLED'
  );
};

export const requiresRejectionReason = (value: OrderStatusCode | string) =>
  normalizeOrderStatusCode(value) === 'REJECTED';

export const isCustomerCancellableOrderStatus = (value: OrderStatusCode | string) => {
  const normalizedStatus = normalizeOrderStatusCode(value);
  return normalizedStatus === 'PENDING' || normalizedStatus === 'ACCEPTED';
};
