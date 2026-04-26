export const CANONICAL_ORDER_STATUS_DISPLAY = {
  WAITING: 'Pending',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
} as const;

export type OrderStatusCode = keyof typeof CANONICAL_ORDER_STATUS_DISPLAY;
export type OrderStatus = (typeof CANONICAL_ORDER_STATUS_DISPLAY)[OrderStatusCode];

export const ORDER_STATUS_DISPLAY = CANONICAL_ORDER_STATUS_DISPLAY;

export const ORDER_STATUS_FIRESTORE_VALUES = {
  WAITING: 'pending',
  PREPARING: 'preparing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type OrderFirestoreStatus = (
  typeof ORDER_STATUS_FIRESTORE_VALUES
)[OrderStatusCode];

export const ORDER_STATUS_PROGRESS_FLOW: readonly OrderStatusCode[] = [
  'WAITING',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatusCode, readonly OrderStatusCode[]> = {
  WAITING: ['PREPARING', 'REJECTED', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_CUSTOMER_COPY: Record<OrderStatusCode, string> = {
  WAITING: 'Waiting for confirmation.',
  PREPARING: 'Preparing your order.',
  OUT_FOR_DELIVERY: 'On the way.',
  DELIVERED: 'Delivered.',
  REJECTED: 'Order rejected.',
  CANCELLED: 'Order cancelled.',
};

const LEGACY_STATUS_MAP: Record<string, OrderStatusCode> = {
  PLACED: 'WAITING',
  PENDING: 'WAITING',
  ACCEPT: 'PREPARING',
  ACCEPTED: 'PREPARING',
  WAITING: 'WAITING',
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

export const normalizeStatus = (value: unknown): OrderStatusCode => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'WAITING';
  }

  const normalized = normalizeStatusKey(value);
  return LEGACY_STATUS_MAP[normalized] || 'WAITING';
};

export const normalizeOrderStatusCode = normalizeStatus;

export const getOrderStatusLabel = (value: OrderStatusCode | string): OrderStatus =>
  ORDER_STATUS_DISPLAY[normalizeStatus(value)];

export const getOrderStatusFirestoreValue = (
  value: OrderStatusCode | string,
): OrderFirestoreStatus => ORDER_STATUS_FIRESTORE_VALUES[normalizeStatus(value)];

export const getOrderStatusCustomerCopy = (value: OrderStatusCode | string) =>
  ORDER_STATUS_CUSTOMER_COPY[normalizeStatus(value)];

export const getAllowedNextOrderStatuses = (value: OrderStatusCode | string) =>
  ORDER_STATUS_TRANSITIONS[normalizeStatus(value)];

export const isValidOrderStatusTransition = (
  currentStatus: OrderStatusCode | string,
  nextStatus: OrderStatusCode | string,
) =>
  getAllowedNextOrderStatuses(currentStatus).includes(normalizeStatus(nextStatus));

export const getStepIndex = (value: OrderStatusCode | string) =>
  ORDER_STATUS_PROGRESS_FLOW.indexOf(normalizeStatus(value));

export const isTerminalOrderStatus = (value: OrderStatusCode | string) => {
  const normalizedStatus = normalizeStatus(value);
  return (
    normalizedStatus === 'DELIVERED' ||
    normalizedStatus === 'REJECTED' ||
    normalizedStatus === 'CANCELLED'
  );
};

export const requiresRejectionReason = (value: OrderStatusCode | string) =>
  normalizeStatus(value) === 'REJECTED';

export const isCustomerCancellableOrderStatus = (value: OrderStatusCode | string) =>
  normalizeStatus(value) === 'WAITING';
