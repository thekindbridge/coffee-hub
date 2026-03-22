import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import type {
  CheckoutCustomerDetails,
  CheckoutOrderItemPayload,
  DeliveryAgent,
  DeliveryLocation,
  DeliverySession,
  MenuItem,
  Order,
  OrderItem,
} from '../../../types';
import type {
  AgentStatus,
  AgentVehicleType,
  CustomerProfile,
  StaffProfile,
  StaffRole,
} from '../types';

const ORDER_ITEMS_IN_QUERY_LIMIT = 10;

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

export const mapLocationRecord = (value: unknown): DeliveryLocation | null => {
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

export const mapDeliveryAgentDocToAgent = (
  snapshot: QueryDocumentSnapshot,
): DeliveryAgent => {
  const data = snapshot.data() as Record<string, unknown>;
  const statusValue = typeof data.status === 'string' ? data.status.toLowerCase() : '';
  const isActive = Boolean(
    data.isActive ?? (statusValue ? statusValue !== 'offline' : false),
  );
  const currentLocation = mapLocationRecord(data.currentLocation);

  return {
    id: snapshot.id,
    name: (data.name as string) || 'Delivery Partner',
    phone: (data.phone as string) || '',
    email: (data.email as string) || '',
    vehicle_type: (data.vehicleType as string) || '',
    status: statusValue === 'offline'
      ? 'offline'
      : statusValue === 'busy'
        ? 'busy'
        : statusValue
          ? 'available'
          : undefined,
    is_active: isActive,
    current_order_id: (data.currentOrderId as string) || '',
    current_location: currentLocation,
    last_location: currentLocation ?? mapLocationRecord(data.lastLocation),
  };
};

export const mapDeliverySessionDocToSession = (
  snapshot: QueryDocumentSnapshot,
): DeliverySession => {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    order_id: snapshot.id,
    order_doc_id: (data.orderDocId as string) || '',
    agent_id: (data.agentId as string) || '',
    agent_name: (data.agentName as string) || '',
    status: ((data.status as DeliverySession['status']) || 'assigned'),
    started_at: mapTimestampToIsoString(data.startedAt),
    completed_at: mapTimestampToIsoString(data.completedAt),
  };
};

export const normalizeOrderStatus = (status: unknown): Order['status'] => {
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'placed' || normalized === 'pending') {
      return 'Pending';
    }
    if (normalized === 'preparing') {
      return 'Preparing';
    }
    if (
      normalized === 'ready for pickup' ||
      normalized === 'ready' ||
      normalized === 'assigned' ||
      normalized === 'assigned to agent' ||
      normalized === 'assigned to rider' ||
      normalized === 'picked up' ||
      normalized === 'picked'
    ) {
      return normalized === 'ready for pickup' || normalized === 'ready'
        ? 'Preparing'
        : 'Out for Delivery';
    }
    if (normalized === 'out for delivery') {
      return 'Out for Delivery';
    }
    if (normalized === 'delivered') {
      return 'Delivered';
    }
  }

  return 'Pending';
};

export const EMPTY_PROFILE: CustomerProfile = {
  name: '',
  phone: '',
  email: '',
  addresses: ['', '', ''],
};

export const EMPTY_STAFF_PROFILE: StaffProfile = {
  role: 'admin',
  name: '',
  phone: '',
  email: '',
  adminLocation: '',
  vehicleType: '',
  status: 'Available',
};

export const ensureProfileAddresses = (addresses: string[] = []) => {
  const normalized = [...addresses];
  while (normalized.length < 3) {
    normalized.push('');
  }
  return normalized.slice(0, 3);
};

export const mapProfileDocToProfile = (
  data?: Record<string, unknown>,
): CustomerProfile => {
  if (!data) {
    return { ...EMPTY_PROFILE };
  }

  const addressRecord = data.addresses && typeof data.addresses === 'object'
    ? (data.addresses as Record<string, unknown>)
    : {};

  return {
    name: (data.name as string) || '',
    phone: (data.phone as string) || '',
    email: (data.email as string) || '',
    addresses: ensureProfileAddresses([
      (addressRecord.address1 as string) || '',
      (addressRecord.address2 as string) || '',
      (addressRecord.address3 as string) || '',
    ]),
  };
};

const normalizeStaffRole = (value: unknown, fallback: StaffRole): StaffRole =>
  value === 'admin' || value === 'agent' ? value : fallback;

const normalizeVehicleType = (value: unknown): AgentVehicleType =>
  value === 'Bike' || value === 'Scooter' || value === 'Cycle' ? value : '';

const normalizeAgentStatus = (value: unknown): AgentStatus => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'available') return 'Available';
    if (normalized === 'offline') return 'Offline';
  }
  return 'Available';
};

export const mapStaffProfileDocToProfile = (
  data: Record<string, unknown> | undefined,
  fallbackRole: StaffRole,
): StaffProfile => ({
  role: normalizeStaffRole(data?.role, fallbackRole),
  name: (data?.name as string) || '',
  phone: (data?.phone as string) || '',
  email: (data?.email as string) || '',
  adminLocation: (data?.adminLocation as string) || '',
  vehicleType: normalizeVehicleType(data?.vehicleType),
  status: normalizeAgentStatus(data?.status),
});

const stripPhonePrefix = (phone: string) => phone.replace(/^\+91\s*/i, '');

export const formatPhoneWithPrefix = (phone: string) => {
  const trimmed = phone.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  return `+91 ${trimmed}`;
};

export const buildProfileDraft = (profile: CustomerProfile) => ({
  ...profile,
  phone: stripPhonePrefix(profile.phone),
  addresses: ensureProfileAddresses(profile.addresses),
});

export const buildStaffProfileDraft = (profile: StaffProfile): StaffProfile => ({
  ...profile,
  phone: stripPhonePrefix(profile.phone),
});

export const mapMenuDocToMenuItem = (snapshot: QueryDocumentSnapshot): MenuItem => {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    id: snapshot.id,
    name: (data.name as string) || '',
    category: (data.category as string) || 'Other',
    price: Number(data.price || 0),
    spice_level: Number(data.spiceLevel ?? 0),
    is_veg: Boolean(data.veg ?? true),
    rating: Number(data.rating || 0),
    image_url: (data.image as string) || '',
    description: (data.description as string) || '',
    is_available: data.isAvailable !== false,
  };
};

export const mapOrderDocToOrder = (snapshot: QueryDocumentSnapshot): Order => {
  const data = snapshot.data() as Record<string, unknown>;
  const createdAtValue = data.createdAt as Timestamp | undefined;
  const subtotal = Number(data.subtotal ?? data.total ?? 0);
  const discount = Number(data.discount || 0);
  const deliveryFee = Number(data.deliveryFee || 0);
  const finalTotal = Number(data.finalTotal ?? data.total ?? Math.max(0, subtotal - discount));
  const assignedAt = mapTimestampToIsoString(data.assignedAt ?? data.deliveryAssignedAt ?? data.delivery_assigned_at);
  const pickedAt = mapTimestampToIsoString(data.pickedAt ?? data.deliveryPickedAt ?? data.delivery_picked_at);
  const outForDeliveryAt = mapTimestampToIsoString(
    data.outForDeliveryAt ?? data.deliveryOutForDeliveryAt ?? data.delivery_out_for_delivery_at,
  );
  const deliveredAt = mapTimestampToIsoString(data.deliveredAt ?? data.deliveryDeliveredAt ?? data.delivery_delivered_at);
  const preparingAt = mapTimestampToIsoString(data.preparingAt ?? data.preparing_at);
  const readyAt = mapTimestampToIsoString(data.readyAt ?? data.readyForPickupAt ?? data.ready_for_pickup_at);
  const agentId = ((data.agentId as string) || (data.deliveryAgentId as string) || (data.delivery_agent_id as string) || '').trim();
  const agentName = (data.agentName as string) || (data.deliveryAgentName as string) || (data.delivery_agent_name as string) || '';
  const agentPhone = (data.agentPhone as string) || (data.deliveryAgentPhone as string) || (data.delivery_agent_phone as string) || '';
  const agentVehicle = (data.agentVehicle as string) || (data.deliveryAgentVehicle as string) || (data.delivery_agent_vehicle as string) || '';
  const agentEmail = (data.agentEmail as string) || (data.deliveryAgentEmail as string) || (data.delivery_agent_email as string) || '';

  return {
    id: ((data.orderId as string) || snapshot.id).toUpperCase(),
    doc_id: snapshot.id,
    customer_name: (data.name as string) || '',
    phone: (data.phone as string) || '',
    address: (data.address as string) || '',
    customer_location: mapLocationRecord(data.customerLocation),
    total_amount: finalTotal,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    coupon_code: ((data.couponCode as string) || '').toUpperCase(),
    final_total: finalTotal,
    status: normalizeOrderStatus(data.status),
    payment_method: (data.paymentMethod as string) || 'Cash on Delivery',
    payment_status: (data.paymentStatus as Order['payment_status']) || 'pending',
    created_at: createdAtValue?.toDate()?.toISOString() || new Date().toISOString(),
    user_id: (data.userId as string) || '',
    razorpay_order_id: (data.razorpayOrderId as string) || '',
    razorpay_payment_id: (data.razorpayPaymentId as string) || '',
    razorpay_signature: (data.razorpaySignature as string) || '',
    delivery_agent_id: agentId,
    delivery_agent_name: agentName,
    delivery_agent_phone: agentPhone,
    delivery_agent_email: agentEmail,
    delivery_agent_vehicle: agentVehicle,
    delivery_assigned_at: assignedAt,
    delivery_picked_at: pickedAt,
    delivery_out_for_delivery_at: outForDeliveryAt,
    delivery_delivered_at: deliveredAt,
    preparing_at: preparingAt,
    ready_for_pickup_at: readyAt,
  };
};

export const buildLocalOrderState = (params: {
  docId: string;
  orderId: string;
  customer: Omit<CheckoutCustomerDetails, 'payment'>;
  paymentMethod: string;
  paymentStatus?: Order['payment_status'];
  userId: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  couponCode: string;
  finalTotal: number;
  items: CheckoutOrderItemPayload[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  createdAt?: string;
}): Order => ({
  id: params.orderId,
  doc_id: params.docId,
  customer_name: params.customer.name,
  phone: params.customer.phone,
  address: params.customer.address,
  customer_location: params.customer.location,
  total_amount: params.finalTotal,
  subtotal: params.subtotal,
  discount: params.discount,
  delivery_fee: params.deliveryFee,
  coupon_code: params.couponCode,
  final_total: params.finalTotal,
  status: 'Pending',
  payment_method: params.paymentMethod,
  payment_status: params.paymentStatus || 'pending',
  created_at: params.createdAt || new Date().toISOString(),
  user_id: params.userId,
  razorpay_order_id: params.razorpayOrderId || '',
  razorpay_payment_id: params.razorpayPaymentId || '',
  razorpay_signature: params.razorpaySignature || '',
  delivery_agent_id: '',
  delivery_agent_name: '',
  delivery_agent_phone: '',
  delivery_agent_email: '',
  delivery_agent_vehicle: '',
  delivery_assigned_at: '',
  delivery_picked_at: '',
  delivery_out_for_delivery_at: '',
  delivery_delivered_at: '',
  preparing_at: '',
  ready_for_pickup_at: '',
  items: params.items.map(item => ({
    id: item.id,
    order_id: params.orderId,
    menu_item_id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  })),
});

const chunkValues = <T,>(values: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
};

export const fetchOrderItemsMap = async (orderIds: string[]) => {
  const normalizedOrderIds = Array.from(
    new Set(
      orderIds
        .map(orderId => orderId.trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  const itemsByOrderId = new Map<string, OrderItem[]>();
  if (normalizedOrderIds.length === 0) {
    return itemsByOrderId;
  }

  const orderIdChunks = chunkValues(normalizedOrderIds, ORDER_ITEMS_IN_QUERY_LIMIT);
  await Promise.all(orderIdChunks.map(async orderIdChunk => {
    const orderItemsQuery = query(
      collection(db, 'order_items'),
      where('orderId', 'in', orderIdChunk),
    );
    const orderItemsSnapshot = await getDocs(orderItemsQuery);

    orderItemsSnapshot.docs.forEach(orderItemDoc => {
      const itemData = orderItemDoc.data() as Record<string, unknown>;
      const orderId = ((itemData.orderId as string) || '').trim().toUpperCase();
      if (!orderId) {
        return;
      }

      const mappedOrderItem: OrderItem = {
        id: orderItemDoc.id,
        order_id: orderId,
        menu_item_id: (itemData.itemId as string) || '',
        name: (itemData.name as string) || 'Item',
        quantity: Number(itemData.quantity || 0),
        price: Number(itemData.price || 0),
      };

      const existingItems = itemsByOrderId.get(orderId) || [];
      existingItems.push(mappedOrderItem);
      itemsByOrderId.set(orderId, existingItems);
    });
  }));

  return itemsByOrderId;
};
