import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import type { Order, OrderItem, OrderStatusCode } from '../types';
import {
  isTerminalOrderStatus,
  isValidOrderStatusTransition,
  mapStatusCodeToStatus,
  normalizeOrderStatusCode,
  requiresRejectionReason,
} from '../types';
import { getFirebaseDb } from '../../services/firebase';
import { AppServiceError, toAppServiceError } from '../../services/serviceError';

const ORDERS_COLLECTION = 'orders';
const FALLBACK_TIMESTAMP_ISO = new Date(0).toISOString();

const mapTimestampToIsoString = (value: unknown) => {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return '';
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
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
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
    if (!item || typeof item !== 'object') {
      return [];
    }

    const itemData = item as Record<string, unknown>;
    const itemId = ((itemData.itemId as string) || (itemData.id as string) || '').trim();

    return [{
      id: `${itemId || 'item'}-${index + 1}`,
      order_id: orderId,
      menu_item_id: itemId,
      name: (itemData.name as string) || 'Item',
      quantity: Number(itemData.quantity || 0),
      price: Number(itemData.price || 0),
    }];
  });
};

const mapOrderDocToOrder = (snapshot: QueryDocumentSnapshot): Order => {
  const data = snapshot.data() as Record<string, unknown>;
  const createdAtValue = (data.createdAt ?? data.created_at) as Timestamp | undefined;
  const updatedAtValue = (data.updatedAt ?? data.updated_at) as Timestamp | undefined;
  const createdAt = createdAtValue?.toDate?.().toISOString() || FALLBACK_TIMESTAMP_ISO;
  const updatedAt = updatedAtValue?.toDate?.().toISOString() || '';
  const orderId = ((data.orderId as string) || snapshot.id).toUpperCase();
  const statusCode = normalizeOrderStatusCode(
    data.status ?? data.orderStatus ?? data.status_code,
  );
  const subtotal = Number(data.subtotal ?? data.totalAmount ?? data.finalTotal ?? data.total ?? 0);
  const discount = Number(data.discount || 0);
  const deliveryFee = Number(data.deliveryFee ?? data.delivery_fee ?? 0);
  const finalTotal = Number(
    data.totalAmount ??
    data.total_amount ??
    data.finalTotal ??
    data.final_total ??
    data.total ??
    Math.max(0, subtotal - discount),
  );
  const embeddedItems = mapEmbeddedOrderItems(orderId, data.items);

  return {
    id: orderId,
    doc_id: snapshot.id,
    customer_name: (
      (data.name as string) ||
      (data.customerName as string) ||
      (data.customer_name as string) ||
      ''
    ).trim(),
    phone: ((data.phone as string) || '').trim(),
    address: ((data.address as string) || '').trim(),
    total_amount: finalTotal,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    coupon_code: ((data.couponCode as string) || (data.coupon_code as string) || '').toUpperCase(),
    final_total: finalTotal,
    status: mapStatusCodeToStatus(statusCode),
    status_code: statusCode,
    rejection_reason: (
      (data.rejectionReason as string) ||
      (data.rejection_reason as string) ||
      ''
    ).trim(),
    cancellation_reason: (
      (data.cancellationReason as string) ||
      (data.cancellation_reason as string) ||
      ''
    ).trim(),
    payment_method: (
      (data.paymentMode as string) ||
      (data.payment_method as string) ||
      (data.paymentMethod as string) ||
      'COD'
    ).trim(),
    payment_status: typeof data.paymentStatus === 'string' && data.paymentStatus.toLowerCase() === 'paid'
      ? 'paid'
      : 'pending',
    created_at: createdAt,
    updated_at: updatedAt,
    cancelled_at: mapTimestampToIsoString(data.cancelledAt ?? data.cancelled_at),
    user_id: ((data.userId as string) || (data.user_id as string) || '').trim(),
    customer_location: mapLocationRecord(data.customerLocation ?? data.customer_location),
    delivery_location: mapLocationRecord(data.deliveryLocation ?? data.delivery_location),
    delivery_agent_id: (
      (data.assignedAgentId as string) ||
      (data.deliveryAgentId as string) ||
      (data.delivery_agent_id as string) ||
      ''
    ).trim(),
    delivery_agent_name: (
      (data.assignedAgentName as string) ||
      (data.deliveryAgentName as string) ||
      (data.delivery_agent_name as string) ||
      ''
    ).trim(),
    delivery_agent_phone: (
      (data.assignedAgentPhone as string) ||
      (data.deliveryAgentPhone as string) ||
      (data.delivery_agent_phone as string) ||
      ''
    ).trim(),
    delivery_agent_email: (
      (data.assignedAgentEmail as string) ||
      (data.deliveryAgentEmail as string) ||
      (data.delivery_agent_email as string) ||
      ''
    ).trim(),
    delivery_agent_vehicle: (
      (data.assignedAgentVehicle as string) ||
      (data.deliveryAgentVehicle as string) ||
      (data.delivery_agent_vehicle as string) ||
      ''
    ).trim(),
    delivery_assigned_at: mapTimestampToIsoString(data.assignedAt ?? data.deliveryAssignedAt),
    delivery_picked_at: mapTimestampToIsoString(data.pickedAt ?? data.deliveryPickedAt),
    delivery_out_for_delivery_at: mapTimestampToIsoString(
      data.outForDeliveryAt ?? data.deliveryOutForDeliveryAt,
    ),
    delivery_delivered_at: mapTimestampToIsoString(
      data.deliveredAt ?? data.deliveryDeliveredAt,
    ),
    preparing_at: mapTimestampToIsoString(data.preparingAt ?? data.preparing_at),
    ready_for_pickup_at: mapTimestampToIsoString(
      data.readyAt ?? data.readyForPickupAt ?? data.ready_for_pickup_at,
    ),
    items: embeddedItems,
  };
};

export const subscribeToAdminOrders = (
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => {
  const db = getFirebaseDb();
  let fallbackSubscribed = false;
  let unsubscribe = () => {};

  const subscribe = (withOrderBy: boolean) => {
    unsubscribe = onSnapshot(
      withOrderBy
        ? query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'))
        : collection(db, ORDERS_COLLECTION),
      snapshot => {
        const orders = snapshot.docs
          .map(mapOrderDocToOrder)
          .sort((left, right) => (
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
          ));
        onData(orders);
      },
      error => {
        const errorCode = (error as { code?: string }).code;
        if (withOrderBy && !fallbackSubscribed && errorCode === 'failed-precondition') {
          fallbackSubscribed = true;
          unsubscribe();
          subscribe(false);
          return;
        }

        console.error('Failed to subscribe to admin orders:', error);
        onError(toAppServiceError(error, 'Unable to load orders.', 'network'));
      },
    );
  };

  subscribe(true);

  return () => {
    unsubscribe();
  };
};

type UpdateAdminOrderStatusParams = {
  order: Order;
  nextStatus: OrderStatusCode | string;
  rejectionReason?: string;
};

export const updateAdminOrderStatus = async ({
  order,
  nextStatus,
  rejectionReason = '',
}: UpdateAdminOrderStatusParams) => {
  const normalizedCurrentStatus = normalizeOrderStatusCode(order.status_code);
  const normalizedNextStatus = normalizeOrderStatusCode(nextStatus);
  const trimmedReason = rejectionReason.trim();

  if (normalizedCurrentStatus === normalizedNextStatus) {
    throw new AppServiceError('Order is already in that status.', {
      code: 'validation',
    });
  }

  if (isTerminalOrderStatus(normalizedCurrentStatus)) {
    throw new AppServiceError('Delivered, rejected, or cancelled orders cannot be changed.', {
      code: 'validation',
    });
  }

  if (!isValidOrderStatusTransition(normalizedCurrentStatus, normalizedNextStatus)) {
    throw new AppServiceError('That status change is not allowed for this order.', {
      code: 'validation',
    });
  }

  if (requiresRejectionReason(normalizedNextStatus) && !trimmedReason) {
    throw new AppServiceError('Enter a rejection reason before rejecting the order.', {
      code: 'validation',
    });
  }

  const db = getFirebaseDb();
  const orderRef = doc(db, ORDERS_COLLECTION, order.doc_id);
  const batch = writeBatch(db);
  const orderUpdate: Record<string, unknown> = {
    status: normalizedNextStatus,
    orderStatus: normalizedNextStatus,
    rejectionReason: normalizedNextStatus === 'REJECTED' ? trimmedReason : '',
    updatedAt: serverTimestamp(),
  };

  if (normalizedNextStatus === 'ACCEPTED') {
    orderUpdate.acceptedAt = serverTimestamp();
  }

  if (normalizedNextStatus === 'PREPARING') {
    orderUpdate.preparingAt = serverTimestamp();
  }

  if (normalizedNextStatus === 'OUT_FOR_DELIVERY') {
    orderUpdate.assignedAt = serverTimestamp();
    orderUpdate.deliveryAssignedAt = serverTimestamp();
    orderUpdate.outForDeliveryAt = serverTimestamp();
    orderUpdate.deliveryOutForDeliveryAt = serverTimestamp();
  }

  if (normalizedNextStatus === 'DELIVERED') {
    orderUpdate.deliveredAt = serverTimestamp();
    orderUpdate.deliveryDeliveredAt = serverTimestamp();
  }

  if (normalizedNextStatus === 'REJECTED') {
    orderUpdate.rejectedAt = serverTimestamp();
  }

  batch.update(orderRef, orderUpdate);

  if (normalizedNextStatus === 'DELIVERED' && order.delivery_agent_id) {
    const agentRef = doc(db, 'agents', order.delivery_agent_id);
    batch.set(agentRef, {
      currentOrderId: '',
      status: 'AVAILABLE',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error('Failed to update admin order status', error);
    throw toAppServiceError(error, 'Unable to update the order right now.', 'network');
  }
};
