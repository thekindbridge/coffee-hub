import {
  getOrderStatusLabel,
  normalizeOrderStatusCode,
} from '../../shared/orderStatus.js';

type TimestampLike = {
  toDate?: () => Date;
};

type StoredOrderItem = {
  itemId?: string;
  name?: string;
  quantity?: number;
  price?: number;
};

export interface StoredOrderRecord {
  orderId?: string;
  userId?: string;
  name?: string;
  phone?: string;
  address?: string;
  customerLocation?: Record<string, unknown> | null;
  items?: StoredOrderItem[];
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  couponCode?: string;
  totalAmount?: number;
  finalAmount?: number;
  paymentMode?: string;
  paymentStatus?: string;
  status?: string;
  orderStatus?: string;
  rejectionReason?: string;
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentVehicle?: string;
  deliveryAgentId?: string;
  deliveryAgentName?: string;
  deliveryAgentPhone?: string;
  deliveryAgentEmail?: string;
  deliveryAgentVehicle?: string;
  delivery_agent_id?: string;
  delivery_agent_name?: string;
  delivery_agent_phone?: string;
  delivery_agent_email?: string;
  delivery_agent_vehicle?: string;
  assignedAt?: TimestampLike;
  acceptedAt?: TimestampLike;
  pickedAt?: TimestampLike;
  outForDeliveryAt?: TimestampLike;
  deliveredAt?: TimestampLike;
  rejectedAt?: TimestampLike;
  preparingAt?: TimestampLike;
  readyAt?: TimestampLike;
  deliveryAssignedAt?: TimestampLike;
  deliveryPickedAt?: TimestampLike;
  deliveryOutForDeliveryAt?: TimestampLike;
  deliveryDeliveredAt?: TimestampLike;
  readyForPickupAt?: TimestampLike;
  delivery_assigned_at?: TimestampLike;
  delivery_picked_at?: TimestampLike;
  delivery_out_for_delivery_at?: TimestampLike;
  delivery_delivered_at?: TimestampLike;
  preparing_at?: TimestampLike;
  ready_for_pickup_at?: TimestampLike;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

const mapTimestampToIsoString = (value: unknown) => {
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
    return (value as TimestampLike).toDate?.()?.toISOString() || '';
  }

  return '';
};

const mapLocationRecord = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : undefined,
    updated_at: mapTimestampToIsoString(data.updatedAt),
  };
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

const normalizePaymentStatus = (value: unknown) => {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'paid') {
    return 'paid';
  }

  return 'pending';
};

const mapEmbeddedOrderItems = (orderId: string, items: StoredOrderItem[] = []) =>
  items.map((item, index) => ({
    id: `${item.itemId || 'item'}-${index + 1}`,
    order_id: orderId,
    menu_item_id: item.itemId || '',
    name: item.name || 'Item',
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
  }));

export const mapOrderRecordToResponse = (
  orderDocId: string,
  record: StoredOrderRecord,
) => {
  const orderId = ((record.orderId as string) || orderDocId).toUpperCase();
  const statusCode = normalizeOrderStatusCode(record.status ?? record.orderStatus);
  const subtotal = Number(record.subtotal ?? record.totalAmount ?? 0);
  const discount = Number(record.discount || 0);
  const deliveryFee = Number(record.deliveryFee || 0);
  const totalAmount = Number(record.totalAmount ?? record.finalAmount ?? subtotal - discount + deliveryFee);
  const assignedAt = mapTimestampToIsoString(
    record.assignedAt ?? record.deliveryAssignedAt ?? record.delivery_assigned_at,
  );
  const pickedAt = mapTimestampToIsoString(
    record.pickedAt ?? record.deliveryPickedAt ?? record.delivery_picked_at,
  );
  const outForDeliveryAt = mapTimestampToIsoString(
    record.outForDeliveryAt ?? record.deliveryOutForDeliveryAt ?? record.delivery_out_for_delivery_at,
  );
  const deliveredAt = mapTimestampToIsoString(
    record.deliveredAt ?? record.deliveryDeliveredAt ?? record.delivery_delivered_at,
  );
  const preparingAt = mapTimestampToIsoString(record.preparingAt ?? record.preparing_at);
  const readyAt = mapTimestampToIsoString(record.readyAt ?? record.readyForPickupAt ?? record.ready_for_pickup_at);
  const agentId = (
    record.agentId ||
    record.deliveryAgentId ||
    record.delivery_agent_id ||
    ''
  ).trim();

  return {
    id: orderId,
    doc_id: orderDocId,
    customer_name: record.name || '',
    phone: record.phone || '',
    address: record.address || '',
    customer_location: mapLocationRecord(record.customerLocation),
    total_amount: totalAmount,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    coupon_code: (record.couponCode || '').toUpperCase(),
    final_total: totalAmount,
    status: getOrderStatusLabel(statusCode),
    status_code: statusCode,
    rejection_reason: (record.rejectionReason || '').trim(),
    payment_method: normalizePaymentMethod(record.paymentMode),
    payment_status: normalizePaymentStatus(record.paymentStatus),
    created_at: mapTimestampToIsoString(record.createdAt) || new Date().toISOString(),
    updated_at: mapTimestampToIsoString(record.updatedAt),
    user_id: record.userId || '',
    delivery_agent_id: agentId,
    delivery_agent_name: record.agentName || record.deliveryAgentName || record.delivery_agent_name || '',
    delivery_agent_phone: record.agentPhone || record.deliveryAgentPhone || record.delivery_agent_phone || '',
    delivery_agent_email: record.agentEmail || record.deliveryAgentEmail || record.delivery_agent_email || '',
    delivery_agent_vehicle: record.agentVehicle || record.deliveryAgentVehicle || record.delivery_agent_vehicle || '',
    delivery_assigned_at: assignedAt,
    delivery_picked_at: pickedAt,
    delivery_out_for_delivery_at: outForDeliveryAt,
    delivery_delivered_at: deliveredAt,
    preparing_at: preparingAt,
    ready_for_pickup_at: readyAt,
    items: mapEmbeddedOrderItems(orderId, record.items),
  };
};

export const mapMenuRecordToResponse = (
  docId: string,
  record: Record<string, unknown>,
) => ({
  id: docId,
  name: (record.name as string) || '',
  category: (record.category as string) || 'Other',
  price: Number(record.price || 0),
  spice_level: Number(record.spiceLevel ?? 0),
  is_veg: Boolean(record.veg ?? true),
  rating: Number(record.rating || 0),
  image_url: (record.image as string) || '',
  description: (record.description as string) || '',
  is_available: record.isAvailable !== false,
});
