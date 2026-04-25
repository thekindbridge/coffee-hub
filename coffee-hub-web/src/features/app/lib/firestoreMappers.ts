import type { QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import {
  getOrderStatusLabel,
  normalizeOrderStatusCode,
} from '../../../../shared/orderStatus';
import type {
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
  NotificationSettings,
  StaffProfile,
  StaffRole,
  UserRole,
} from '../types';
import {
  formatPhoneForDisplay,
  normalizePhoneNumber,
  safeNormalizePhoneNumber,
} from '../../../../shared/phone';
import { normalizeUserRole } from '../../../../shared/userRole';

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

export const mapLocationRecord = (value: unknown): DeliveryLocation | null => {
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
    updated_at: mapTimestampToIsoString(data.updatedAt),
  };
};

const normalizeStoredAgentStatus = (
  status: unknown,
  isActive: boolean,
): DeliveryAgent['status'] => {
  if (!isActive) {
    return 'offline';
  }

  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'busy') {
      return 'busy';
    }
    if (normalized === 'offline') {
      return 'offline';
    }
    if (normalized === 'available') {
      return 'available';
    }
  }

  return 'available';
};

export const mapAgentRecordToAgent = (
  agentId: string,
  data: Record<string, unknown>,
): DeliveryAgent => {
  const explicitIsActive = data.isActive;
  const isActive = typeof explicitIsActive === 'boolean'
    ? explicitIsActive
    : true;
  const currentLocation = mapLocationRecord(data.currentLocation);

  return {
    id: agentId,
    name: (data.name as string) || '',
    phone: (data.phone as string) || '',
    email: (data.email as string) || '',
    vehicle_type: (data.vehicle as string) || (data.vehicleType as string) || '',
    status: normalizeStoredAgentStatus(data.status, isActive),
    is_active: isActive,
    current_order_id: (data.currentOrderId as string) || '',
    current_location: currentLocation,
    last_location: currentLocation ?? mapLocationRecord(data.lastLocation),
  };
};

export const mapDeliveryAgentDocToAgent = (
  snapshot: QueryDocumentSnapshot,
): DeliveryAgent =>
  mapAgentRecordToAgent(snapshot.id, snapshot.data() as Record<string, unknown>);

export const mapDeliverySessionRecordToSession = (
  orderId: string,
  data: Record<string, unknown>,
): DeliverySession => ({
  order_id: orderId,
  order_doc_id: (data.orderDocId as string) || '',
  agent_id: (data.agentId as string) || '',
  agent_name: (data.agentName as string) || '',
  status: ((data.status as DeliverySession['status']) || 'assigned'),
  started_at: mapTimestampToIsoString(data.startedAt),
  completed_at: mapTimestampToIsoString(data.completedAt),
});

export const mapDeliverySessionDocToSession = (
  snapshot: QueryDocumentSnapshot,
): DeliverySession =>
  mapDeliverySessionRecordToSession(snapshot.id, snapshot.data() as Record<string, unknown>);

export const normalizeOrderStatus = (status: unknown): Order['status'] =>
  getOrderStatusLabel(normalizeOrderStatusCode(status));

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

export const EMPTY_PROFILE: CustomerProfile = {
  uid: '',
  name: '',
  phone: '',
  email: '',
  role: 'customer',
  addresses: ['', '', ''],
  adminLocation: '',
  vehicleType: '',
  status: 'Available',
  notificationSettings: {
    orderUpdates: true,
    offers: false,
  },
};

export const EMPTY_STAFF_PROFILE: StaffProfile = {
  uid: '',
  role: 'admin',
  name: '',
  phone: '',
  email: '',
  addresses: ['', '', ''],
  adminLocation: '',
  vehicleType: '',
  status: 'Available',
  notificationSettings: {
    orderUpdates: true,
    offers: false,
  },
};

export const ensureProfileAddresses = (addresses: string[] = []) => {
  const normalized = [...addresses];
  while (normalized.length < 3) {
    normalized.push('');
  }
  return normalized.slice(0, 3);
};

export const normalizeNotificationSettings = (
  value?: unknown,
): NotificationSettings => {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_PROFILE.notificationSettings };
  }

  const data = value as Record<string, unknown>;
  return {
    orderUpdates: data.orderUpdates !== false,
    offers: data.offers === true,
  };
};

const normalizeProfileAgentStatus = (value: unknown): AgentStatus => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'offline') return 'Offline';
  }

  return 'Available';
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
    uid: (data.uid as string) || '',
    name: (data.name as string) || '',
    phone: safeNormalizePhoneNumber((data.phone as string) || ''),
    email: (data.email as string) || '',
    role: normalizeUserRole(data.role),
    addresses: ensureProfileAddresses([
      (addressRecord.address1 as string) || '',
      (addressRecord.address2 as string) || '',
      (addressRecord.address3 as string) || '',
    ]),
    adminLocation: (data.adminLocation as string) || '',
    vehicleType: normalizeVehicleType(data.vehicleType),
    status: normalizeProfileAgentStatus(data.status),
    notificationSettings: normalizeNotificationSettings(data.notificationSettings),
  };
};

const normalizeStaffRole = (value: unknown, fallback: StaffRole): StaffRole =>
  value === 'owner' || value === 'admin' || value === 'delivery_agent' || value === 'agent'
    ? normalizeUserRole(value) as StaffRole
    : fallback;

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
): StaffProfile => {
  const profile = mapProfileDocToProfile(data);
  return {
    ...profile,
    role: normalizeStaffRole(data?.role, fallbackRole),
    status: normalizeAgentStatus(data?.status),
  };
};

export const formatPhoneWithPrefix = (phone: string) => {
  return normalizePhoneNumber(phone);
};

export const buildProfileDraft = (profile: CustomerProfile) => ({
  ...profile,
  phone: formatPhoneForDisplay(profile.phone),
  addresses: ensureProfileAddresses(profile.addresses),
});

export const buildStaffProfileDraft = (profile: StaffProfile): StaffProfile => ({
  ...profile,
  phone: formatPhoneForDisplay(profile.phone),
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

export const mapOrderRecordToOrder = (
  docId: string,
  data: Record<string, unknown>,
): Order => {
  const createdAtValue = data.createdAt as Timestamp | undefined;
  const updatedAtValue = data.updatedAt as Timestamp | undefined;
  const createdAt = createdAtValue?.toDate()?.toISOString() || FALLBACK_TIMESTAMP_ISO;
  const updatedAt = updatedAtValue?.toDate()?.toISOString() || '';
  const orderId = ((data.orderId as string) || docId).toUpperCase();
  const statusCode = normalizeOrderStatusCode(data.status ?? data.orderStatus);
  const subtotal = Number(data.subtotal ?? data.totalAmount ?? data.finalTotal ?? data.total ?? 0);
  const discount = Number(data.discount || 0);
  const deliveryFee = Number(data.deliveryFee || 0);
  const finalTotal = Number(
    data.totalAmount ?? data.finalTotal ?? data.total ?? Math.max(0, subtotal - discount),
  );
  const assignedAt = mapTimestampToIsoString(data.assignedAt ?? data.deliveryAssignedAt ?? data.delivery_assigned_at);
  const pickedAt = mapTimestampToIsoString(data.pickedAt ?? data.deliveryPickedAt ?? data.delivery_picked_at);
  const outForDeliveryAt = mapTimestampToIsoString(
    data.outForDeliveryAt ?? data.deliveryOutForDeliveryAt ?? data.delivery_out_for_delivery_at,
  );
  const deliveredAt = mapTimestampToIsoString(data.deliveredAt ?? data.deliveryDeliveredAt ?? data.delivery_delivered_at);
  const cancelledAt = mapTimestampToIsoString(data.cancelledAt ?? data.cancelled_at);
  const preparingAt = mapTimestampToIsoString(data.preparingAt ?? data.preparing_at);
  const readyAt = mapTimestampToIsoString(data.readyAt ?? data.readyForPickupAt ?? data.ready_for_pickup_at);
  const agentId = (
    (data.assignedAgentId as string) ||
    (data.agentId as string) ||
    (data.deliveryAgentId as string) ||
    (data.delivery_agent_id as string) ||
    ''
  ).trim();
  const agentName = (
    (data.assignedAgentName as string) ||
    (data.agentName as string) ||
    (data.deliveryAgentName as string) ||
    (data.delivery_agent_name as string) ||
    ''
  ).trim();
  const agentPhone = (
    (data.assignedAgentPhone as string) ||
    (data.agentPhone as string) ||
    (data.deliveryAgentPhone as string) ||
    (data.delivery_agent_phone as string) ||
    ''
  ).trim();
  const agentVehicle = (
    (data.assignedAgentVehicle as string) ||
    (data.agentVehicle as string) ||
    (data.deliveryAgentVehicle as string) ||
    (data.delivery_agent_vehicle as string) ||
    ''
  ).trim();
  const agentEmail = (
    (data.assignedAgentEmail as string) ||
    (data.agentEmail as string) ||
    (data.deliveryAgentEmail as string) ||
    (data.delivery_agent_email as string) ||
    ''
  ).trim();
  const embeddedItems = mapEmbeddedOrderItems(orderId, data.items);

  return {
    id: orderId,
    doc_id: docId,
    customer_name: (data.name as string) || (data.customerName as string) || '',
    phone: (data.phone as string) || '',
    address: (data.address as string) || '',
    customer_location: mapLocationRecord(data.customerLocation),
    delivery_location: mapLocationRecord(data.deliveryLocation ?? data.delivery_location),
    total_amount: finalTotal,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    coupon_code: ((data.couponCode as string) || '').toUpperCase(),
    final_total: finalTotal,
    status: getOrderStatusLabel(statusCode),
    status_code: statusCode,
    rejection_reason: ((data.rejectionReason as string) || '').trim(),
    cancellation_reason: ((data.cancellationReason as string) || '').trim(),
    payment_method: normalizePaymentMethod(data.paymentMode ?? data.paymentMethod),
    payment_status: normalizePaymentStatus(data.paymentStatus),
    created_at: createdAt,
    updated_at: updatedAt,
    cancelled_at: cancelledAt,
    user_id: (data.userId as string) || '',
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
    items: embeddedItems,
  };
};

export const mapOrderDocToOrder = (snapshot: QueryDocumentSnapshot): Order =>
  mapOrderRecordToOrder(snapshot.id, snapshot.data() as Record<string, unknown>);
