import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  getOrderStatusFirestoreValue,
  getOrderStatusLabel,
  normalizeOrderStatusCode,
  type OrderStatusCode,
} from '../../shared/orderStatus';
import type { Order, OrderItem, OrderTimestamps } from '../../types';
import { toAppServiceError } from '../serviceError';
import { getFirebaseDb } from './index';

const ORDERS_COLLECTION = 'orders';
const FALLBACK_TIMESTAMP_ISO = new Date(0).toISOString();

type TimestampLike = {
  toDate?: () => Date;
};

const toRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const mapTimestampToIsoString = (value: unknown, fallback = '') => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    value &&
    typeof value === 'object' &&
    typeof (value as TimestampLike).toDate === 'function'
  ) {
    return (value as TimestampLike).toDate?.()?.toISOString() || fallback;
  }

  return fallback;
};

const toFiniteNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const mapLocationRecord = (value: unknown): Order['customer_location'] => {
  const data = toRecord(value);
  if (!data) {
    return null;
  }

  const lat = toFiniteNumber(data.lat);
  const lng = toFiniteNumber(data.lng);
  if (lat === null || lng === null) {
    return null;
  }

  const accuracy = toFiniteNumber(data.accuracy);

  return {
    lat,
    lng,
    accuracy: accuracy ?? undefined,
    updated_at: mapTimestampToIsoString(data.updatedAt ?? data.updated_at),
  };
};

const mapEmbeddedOrderItems = (orderId: string, value: unknown): OrderItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    const itemData = toRecord(item);
    if (!itemData) {
      return [];
    }

    const itemId = `${itemData.itemId ?? itemData.id ?? ''}`.trim();

    return [{
      id: `${itemId || 'item'}-${index + 1}`,
      menu_item_id: itemId,
      name: `${itemData.name ?? 'Item'}`,
      order_id: orderId,
      price: Number(itemData.price || 0),
      quantity: Number(itemData.quantity || 0),
    }];
  });
};

const normalizePaymentMethod = (value: unknown) => {
  if (typeof value !== 'string') {
    return 'COD';
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'cash on delivery' || normalized === 'cod') {
    return 'COD';
  }

  return value.trim();
};

const normalizePaymentStatus = (value: unknown): Order['payment_status'] => {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'paid') {
    return 'paid';
  }

  return 'pending';
};

const resolveOrderTimestamp = (
  data: Record<string, unknown>,
  timestampKey: keyof OrderTimestamps,
  fallbackKeys: string[],
  defaultValue = '',
) => {
  const timestamps = toRecord(data.timestamps);
  const nestedValue = timestamps?.[timestampKey];
  const fallbackValue = fallbackKeys
    .map(key => data[key])
    .find(value => value !== undefined && value !== null);

  return mapTimestampToIsoString(nestedValue ?? fallbackValue, defaultValue);
};

export const sortOrdersByCreatedAtDesc = (orders: Order[]) => [...orders].sort((left, right) => (
  new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
));

export const mapOrderRecordToOrder = (
  docId: string,
  data: Record<string, unknown>,
): Order => {
  const orderId = `${data.orderId ?? docId}`.trim().toUpperCase() || docId.toUpperCase();
  const statusCode = normalizeOrderStatusCode(
    data.status_code ?? data.orderStatus ?? data.status,
  );
  const createdAt = resolveOrderTimestamp(
    data,
    'createdAt',
    ['createdAt', 'created_at'],
    FALLBACK_TIMESTAMP_ISO,
  );
  const updatedAt = mapTimestampToIsoString(data.updatedAt ?? data.updated_at);
  const acceptedAt = resolveOrderTimestamp(data, 'acceptedAt', ['acceptedAt', 'accepted_at']);
  const preparedAt = resolveOrderTimestamp(data, 'preparedAt', ['preparedAt', 'preparingAt', 'prepared_at', 'preparing_at']);
  const outForDeliveryAt = resolveOrderTimestamp(
    data,
    'outForDeliveryAt',
    ['outForDeliveryAt', 'out_for_delivery_at', 'deliveryOutForDeliveryAt', 'delivery_out_for_delivery_at'],
  );
  const deliveredAt = resolveOrderTimestamp(
    data,
    'deliveredAt',
    ['deliveredAt', 'delivered_at', 'deliveryDeliveredAt', 'delivery_delivered_at'],
  );
  const rejectedAt = resolveOrderTimestamp(data, 'rejectedAt', ['rejectedAt', 'rejected_at']);
  const cancelledAt = resolveOrderTimestamp(data, 'cancelledAt', ['cancelledAt', 'cancelled_at']);
  const assignedAt = resolveOrderTimestamp(
    data,
    'outForDeliveryAt',
    ['assignedAt', 'assigned_at', 'deliveryAssignedAt', 'delivery_assigned_at'],
  );
  const pickedAt = mapTimestampToIsoString(
    data.pickedAt ?? data.deliveryPickedAt ?? data.delivery_picked_at,
  );
  const readyAt = mapTimestampToIsoString(
    data.readyAt ?? data.readyForPickupAt ?? data.ready_for_pickup_at,
  );
  const subtotal = Number(data.subtotal ?? data.totalAmount ?? data.finalTotal ?? data.total ?? 0);
  const discount = Number(data.discount || 0);
  const deliveryFee = Number(data.deliveryFee ?? data.delivery_fee ?? 0);
  const finalTotal = Number(
    data.totalAmount ??
    data.total_amount ??
    data.finalAmount ??
    data.finalTotal ??
    data.final_total ??
    data.total ??
    Math.max(0, subtotal - discount + deliveryFee),
  );
  const assignedAgentId = (
    `${data.assignedAgentId ?? data.deliveryAgentId ?? data.agentId ?? data.delivery_agent_id ?? ''}`
  ).trim();
  const assignedAgentName = (
    `${data.assignedAgentName ?? data.deliveryAgentName ?? data.agentName ?? data.delivery_agent_name ?? ''}`
  ).trim();

  return {
    address: `${data.address ?? ''}`.trim(),
    assigned_agent_id: assignedAgentId,
    assigned_agent_name: assignedAgentName,
    cancelled_at: cancelledAt,
    cancellation_reason: `${data.cancellationReason ?? data.cancellation_reason ?? ''}`.trim(),
    coupon_code: `${data.couponCode ?? data.coupon_code ?? ''}`.trim().toUpperCase(),
    created_at: createdAt,
    customer_location: mapLocationRecord(data.customerLocation ?? data.customer_location),
    customer_name: `${data.name ?? data.customerName ?? data.customer_name ?? ''}`.trim(),
    delivery_agent_email: (
      `${data.assignedAgentEmail ?? data.deliveryAgentEmail ?? data.agentEmail ?? data.delivery_agent_email ?? ''}`
    ).trim(),
    delivery_agent_id: assignedAgentId,
    delivery_agent_name: assignedAgentName,
    delivery_agent_phone: (
      `${data.assignedAgentPhone ?? data.deliveryAgentPhone ?? data.agentPhone ?? data.delivery_agent_phone ?? ''}`
    ).trim(),
    delivery_agent_vehicle: (
      `${data.assignedAgentVehicle ?? data.deliveryAgentVehicle ?? data.agentVehicle ?? data.delivery_agent_vehicle ?? ''}`
    ).trim(),
    delivery_assigned_at: assignedAt,
    delivery_delivered_at: deliveredAt,
    delivery_fee: deliveryFee,
    delivery_location: mapLocationRecord(data.deliveryLocation ?? data.delivery_location),
    delivery_out_for_delivery_at: outForDeliveryAt,
    delivery_picked_at: pickedAt,
    discount,
    doc_id: docId,
    final_total: finalTotal,
    id: orderId,
    items: mapEmbeddedOrderItems(orderId, data.items),
    payment_method: normalizePaymentMethod(
      data.paymentMode ?? data.paymentMethod ?? data.payment_method,
    ),
    payment_status: normalizePaymentStatus(data.paymentStatus ?? data.payment_status),
    phone: `${data.phone ?? ''}`.trim(),
    preparing_at: preparedAt,
    ready_for_pickup_at: readyAt,
    rejection_reason: `${data.rejectionReason ?? data.rejection_reason ?? ''}`.trim(),
    status: getOrderStatusLabel(statusCode),
    status_code: statusCode,
    subtotal,
    timestamps: {
      acceptedAt: acceptedAt || undefined,
      cancelledAt: cancelledAt || undefined,
      createdAt,
      deliveredAt: deliveredAt || undefined,
      outForDeliveryAt: outForDeliveryAt || undefined,
      preparedAt: preparedAt || undefined,
      rejectedAt: rejectedAt || undefined,
    },
    total_amount: finalTotal,
    updated_at: updatedAt,
    user_id: `${data.userId ?? data.user_id ?? ''}`.trim(),
  };
};

export const mapOrderDocToOrder = (snapshot: QueryDocumentSnapshot): Order =>
  mapOrderRecordToOrder(snapshot.id, snapshot.data() as Record<string, unknown>);

const subscribeToOrders = (
  constraints: QueryConstraint[],
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => {
  const db = getFirebaseDb();
  const ordersCollection = collection(db, ORDERS_COLLECTION);
  let hasFallback = false;
  let unsubscribe = () => {};

  const startSubscription = (withOrderBy: boolean) => {
    const queryConstraints = withOrderBy
      ? [...constraints, orderBy('createdAt', 'desc')]
      : constraints;

    unsubscribe = onSnapshot(
      query(ordersCollection, ...queryConstraints),
      snapshot => {
        const orders = sortOrdersByCreatedAtDesc(snapshot.docs.map(mapOrderDocToOrder));
        onData(orders);
      },
      error => {
        const errorCode = (error as { code?: string }).code;
        if (withOrderBy && !hasFallback && errorCode === 'failed-precondition') {
          hasFallback = true;
          unsubscribe();
          startSubscription(false);
          return;
        }

        console.error('Failed to subscribe to orders', {
          constraints: queryConstraints.length,
          error,
        });
        onError(toAppServiceError(error, 'Unable to sync orders.', 'network'));
      },
    );
  };

  startSubscription(true);

  return () => {
    unsubscribe();
  };
};

const buildOrderStatusQueryValues = (statusCodes: readonly OrderStatusCode[]) => (
  Array.from(new Set(statusCodes.flatMap(statusCode => {
    const label = getOrderStatusLabel(statusCode);
    return [
      statusCode,
      label,
      getOrderStatusFirestoreValue(statusCode),
    ];
  })))
);

export const subscribeToAdminOrders = (
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => subscribeToOrders([], onData, onError);

export const subscribeToUserOrders = (
  userId: string,
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => subscribeToOrders([
  where('userId', '==', userId.trim().toLowerCase()),
], onData, onError);

export const subscribeToPendingOrders = (
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => subscribeToOrders([
  where('status', 'in', buildOrderStatusQueryValues(['PENDING'])),
], onData, onError);

export const subscribeToKitchenOrders = (
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => subscribeToOrders([
  where(
    'status',
    'in',
    buildOrderStatusQueryValues(['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY']),
  ),
], onData, onError);

export const subscribeToAgentOrders = (
  agentId: string,
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => subscribeToOrders([
  where('assignedAgentId', '==', agentId.trim().toLowerCase()),
], onData, onError);
