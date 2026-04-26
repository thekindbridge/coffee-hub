import { FieldValue } from 'firebase-admin/firestore';
import type {
  DocumentReference,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';

import { ApiError } from '../../../../api/_lib/errors.js';
import {
  buildAdminNewOrderNotification,
  buildAdminOrderCancelledNotification,
  buildAgentAssignmentNotification,
  buildAgentOrderCancelledNotification,
  buildCustomerOrderNotification,
  getAdminRecipients,
  getAgentRecipient,
  getCustomerRecipient,
  sendPushNotification,
} from '../../../../api/_lib/notifications.js';
import {
  mapOrderRecordToResponse,
  type StoredOrderRecord,
} from '../../../../api/_lib/responseMappers.js';
import { assertShopIsOpen } from '../../../../api/_lib/shopTiming.js';
import {
  assertPricingMatches,
  parseCreateOrderBody,
  recalculatePricing,
  type SanitizedOrderDraft,
  type ValidatedPricing,
} from '../../../../api/_lib/orderPricing.js';
import {
  getOrderStatusFirestoreValue,
  isCustomerCancellableOrderStatus,
  isTerminalOrderStatus,
  isValidOrderStatusTransition,
  normalizeOrderStatusCode,
  requiresRejectionReason,
  type OrderStatusCode,
} from '../../../../shared/orderStatus.js';
import {
  getServerDb,
  requireAdminRequest,
  requireUserRequest,
  userHasAdminAccess,
} from './authService.js';
import { getUserRole } from './roleService.js';
import {
  getQueryValue,
  jsonResponse,
  type ApiServiceResponse,
} from './routeUtils.js';

type OrderMutationAction =
  | 'assign-agent'
  | 'cancel'
  | 'complete-delivery'
  | 'update-delivery-tracking'
  | 'update-status';

type DeliveryLocationPayload = {
  accuracy: number | null;
  lat: number;
  lng: number;
};

const ORDER_COUNTER_START = 1001;
const MAX_CANCELLATION_REASON_LENGTH = 160;
const ORDER_MUTATION_ACTIONS = new Set<OrderMutationAction>([
  'assign-agent',
  'cancel',
  'complete-delivery',
  'update-delivery-tracking',
  'update-status',
]);

const normalizeStatusFilter = (value: string) =>
  value.trim().toLowerCase().replace(/_/g, ' ');

const matchesStatusFilter = (
  order: ReturnType<typeof mapOrderRecordToResponse>,
  statusFilter: string,
) => {
  if (!statusFilter) {
    return true;
  }

  return (
    normalizeStatusFilter(order.status) === statusFilter ||
    normalizeStatusFilter(order.status_code) === statusFilter
  );
};

const parseLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), 100);
};

const mapOrderSnapshotToResponse = (
  snapshot: {
    data: () => StoredOrderRecord | undefined;
    id: string;
  },
) => {
  const typedSnapshot = snapshot as QueryDocumentSnapshot;
  return mapOrderRecordToResponse(
    typedSnapshot.id,
    typedSnapshot.data() as StoredOrderRecord,
  );
};

const buildStoredOrderRecord = (
  orderDraft: SanitizedOrderDraft,
  pricing: ValidatedPricing,
  userId: string,
  email: string,
): StoredOrderRecord => ({
  userId,
  email,
  name: orderDraft.customer.name,
  phone: orderDraft.customer.phone,
  address: orderDraft.customer.address,
  customerLocation: orderDraft.customer.location,
  items: pricing.items.map(item => ({
    itemId: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  })),
  subtotal: pricing.subtotal,
  discount: pricing.discount,
  deliveryFee: pricing.deliveryFee,
  couponCode: pricing.couponCode,
  totalAmount: pricing.finalTotal,
  finalAmount: pricing.finalTotal,
  paymentMode: 'COD',
  paymentStatus: 'PENDING',
  status: getOrderStatusFirestoreValue('WAITING'),
  orderStatus: 'WAITING',
  status_code: 'WAITING',
  rejectReason: '',
  rejectionReason: '',
  cancelledBy: '',
  assignedAgentEmail: '',
  assignedAgentId: '',
  assignedAgentName: '',
  assignedAgentPhone: '',
  assignedAgentVehicle: '',
});

const buildOrderNumber = (orderNumber: number) => `COF${String(orderNumber).padStart(4, '0')}`;

const createOrderWithNextNumber = async (
  db: Firestore,
  storedOrder: StoredOrderRecord,
) => {
  const orderRef = db.collection('orders').doc();

  return db.runTransaction(async transaction => {
    const counterRef = db.collection('meta').doc('orderCounter');
    const counterSnapshot = await transaction.get(counterRef);
    const currentValue =
      counterSnapshot.exists && typeof counterSnapshot.data()?.nextOrderNumber === 'number'
        ? counterSnapshot.data()!.nextOrderNumber
        : ORDER_COUNTER_START;
    const orderId = buildOrderNumber(currentValue);

    transaction.set(orderRef, {
      ...storedOrder,
      orderId,
      createdAt: FieldValue.serverTimestamp(),
      timestamps: {
        createdAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(
      counterRef,
      {
        nextOrderNumber: currentValue + 1,
      },
      { merge: true },
    );

    return {
      orderId,
      orderNumber: currentValue,
      orderRef,
    };
  });
};

const loadOrderSnapshotByIdentifier = async (
  adminDb: Firestore,
  orderIdentifier: string,
) => {
  const trimmedIdentifier = orderIdentifier.trim();
  if (!trimmedIdentifier) {
    return null;
  }

  const directSnapshot = await adminDb.collection('orders').doc(trimmedIdentifier).get();
  if (directSnapshot.exists) {
    return directSnapshot as QueryDocumentSnapshot;
  }

  const orderQuery = await adminDb
    .collection('orders')
    .where('orderId', '==', trimmedIdentifier.toUpperCase())
    .limit(1)
    .get();

  return orderQuery.docs[0] || null;
};

const resolveOrderReferenceByIdentifier = async (
  adminDb: Firestore,
  orderIdentifier: string,
): Promise<DocumentReference> => {
  const orderSnapshot = await loadOrderSnapshotByIdentifier(adminDb, orderIdentifier);
  if (!orderSnapshot) {
    throw new ApiError(404, 'Order not found.');
  }

  return orderSnapshot.ref;
};

const parseOrderStatusUpdateBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const rawOrderId = payload.orderId;
  const rawStatus = payload.status_code ?? payload.status;
  const rejectionReason = typeof payload.rejectionReason === 'string'
    ? payload.rejectionReason.trim()
    : '';

  if (typeof rawOrderId !== 'string' || !rawOrderId.trim()) {
    throw new ApiError(400, 'orderId is required.');
  }

  if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
    throw new ApiError(400, 'status or status_code is required.');
  }

  const orderId = rawOrderId.trim();
  const status = normalizeOrderStatusCode(rawStatus);

  if (requiresRejectionReason(status) && !rejectionReason) {
    throw new ApiError(400, 'rejectionReason is required when rejecting an order.');
  }

  return {
    orderId,
    rejectionReason,
    status,
  };
};

const resolveCurrentOrderStatus = (order: StoredOrderRecord) =>
  normalizeOrderStatusCode(order.status_code ?? order.status ?? order.orderStatus);

const logStatusTransition = ({
  from,
  to,
  userRole,
}: {
  from: OrderStatusCode;
  to: OrderStatusCode;
  userRole: string;
}) => {
  console.log('STATUS TRANSITION:', {
    from,
    to,
    userRole,
  });
};

const sendLifecycleNotificationsForStatusTransition = async ({
  adminDb,
  assignedAgentId,
  fromStatus,
  orderId,
  rejectionReason = '',
  toStatus,
  userId,
}: {
  adminDb: Firestore;
  assignedAgentId?: string;
  fromStatus: OrderStatusCode;
  orderId: string;
  rejectionReason?: string;
  toStatus: OrderStatusCode;
  userId?: string;
}) => {
  if (fromStatus === toStatus) {
    return;
  }

  const normalizedAgentId = (assignedAgentId || '').trim().toLowerCase();
  const notificationTasks: Promise<unknown>[] = [];

  if (
    userId &&
    (
      (fromStatus === 'WAITING' && toStatus === 'PREPARING') ||
      (fromStatus === 'WAITING' && toStatus === 'REJECTED') ||
      (fromStatus === 'PREPARING' && toStatus === 'OUT_FOR_DELIVERY') ||
      (fromStatus === 'OUT_FOR_DELIVERY' && toStatus === 'DELIVERED')
    )
  ) {
    notificationTasks.push((async () => {
      const customerRecipient = await getCustomerRecipient(adminDb, userId);
      if (!customerRecipient) {
        return;
      }

      await sendPushNotification(
        adminDb,
        [customerRecipient],
        buildCustomerOrderNotification({
          orderId,
          rejectionReason,
          status: toStatus,
        }),
      );
    })());
  }

  if (fromStatus === 'PREPARING' && toStatus === 'OUT_FOR_DELIVERY' && normalizedAgentId) {
    notificationTasks.push((async () => {
      const agentRecipient = await getAgentRecipient(adminDb, normalizedAgentId);
      if (!agentRecipient) {
        return;
      }

      await sendPushNotification(
        adminDb,
        [agentRecipient],
        buildAgentAssignmentNotification(orderId),
      );
    })());
  }

  await Promise.all(notificationTasks);
};

const buildOrderStatusUpdate = (
  currentOrder: StoredOrderRecord,
  nextStatus: OrderStatusCode,
  rejectionReason: string,
) => {
  const timestampValue = FieldValue.serverTimestamp();
  const update: Record<string, unknown> = {
    status_code: nextStatus,
    status: getOrderStatusFirestoreValue(nextStatus),
    orderStatus: nextStatus,
    rejectReason: nextStatus === 'REJECTED' ? rejectionReason : '',
    rejectionReason: nextStatus === 'REJECTED' ? rejectionReason : '',
    rejection_reason: nextStatus === 'REJECTED' ? rejectionReason : '',
    cancelledBy: '',
    updatedAt: timestampValue,
    updated_at: timestampValue,
  };

  if (nextStatus === 'PREPARING' && !currentOrder.acceptedAt) {
    update.acceptedAt = timestampValue;
    update.accepted_at = timestampValue;
    update['timestamps.acceptedAt'] = timestampValue;
  }

  if (nextStatus === 'PREPARING' && !currentOrder.preparingAt) {
    update.preparingAt = timestampValue;
    update.preparing_at = timestampValue;
    update['timestamps.preparedAt'] = timestampValue;
  }

  if (nextStatus === 'OUT_FOR_DELIVERY') {
    if (!currentOrder.assignedAt && !currentOrder.deliveryAssignedAt) {
      update.assignedAt = timestampValue;
      update.assigned_at = timestampValue;
      update.deliveryAssignedAt = timestampValue;
      update.delivery_assigned_at = timestampValue;
    }

    if (!currentOrder.outForDeliveryAt && !currentOrder.deliveryOutForDeliveryAt) {
      update.outForDeliveryAt = timestampValue;
      update.out_for_delivery_at = timestampValue;
      update.deliveryOutForDeliveryAt = timestampValue;
      update.delivery_out_for_delivery_at = timestampValue;
      update['timestamps.outForDeliveryAt'] = timestampValue;
    }
  }

  if (nextStatus === 'DELIVERED' && !currentOrder.deliveredAt && !currentOrder.deliveryDeliveredAt) {
    update.deliveredAt = timestampValue;
    update.delivered_at = timestampValue;
    update.deliveryDeliveredAt = timestampValue;
    update.delivery_delivered_at = timestampValue;
    update['timestamps.deliveredAt'] = timestampValue;
  }

  if (nextStatus === 'REJECTED' && !currentOrder.rejectedAt) {
    update.rejectedAt = timestampValue;
    update.rejected_at = timestampValue;
    update['timestamps.rejectedAt'] = timestampValue;
  }

  if (nextStatus === 'CANCELLED' && !currentOrder.cancelledAt) {
    update.cancelledAt = timestampValue;
    update.cancelled_at = timestampValue;
    update.cancelledBy = 'customer';
    update['timestamps.cancelledAt'] = timestampValue;
  }

  return update;
};

const parseAssignAgentBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const orderId = typeof payload.orderId === 'string'
    ? payload.orderId.trim()
    : '';
  const agentId = typeof payload.agentId === 'string'
    ? payload.agentId.trim().toLowerCase()
    : '';

  if (!orderId) {
    throw new ApiError(400, 'orderId is required.');
  }

  if (!agentId) {
    throw new ApiError(400, 'agentId is required.');
  }

  return { agentId, orderId };
};

const parseCancelOrderBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const orderId = typeof payload.orderId === 'string'
    ? payload.orderId.trim()
    : '';
  const cancellationReason = typeof payload.cancellationReason === 'string'
    ? payload.cancellationReason.trim()
    : '';

  if (!orderId) {
    throw new ApiError(400, 'orderId is required.');
  }

  if (!cancellationReason) {
    throw new ApiError(400, 'cancellationReason is required.');
  }

  if (cancellationReason.length > MAX_CANCELLATION_REASON_LENGTH) {
    throw new ApiError(400, 'cancellationReason is too long.');
  }

  return {
    cancellationReason,
    orderId,
  };
};

const resolveAssignedAgentId = (order: StoredOrderRecord) => (
  (
    order.assignedAgentId ||
    order.deliveryAgentId ||
    order.agentId ||
    order.delivery_agent_id ||
    ''
  ).trim().toLowerCase()
);

const parseCompleteDeliveryBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const orderId = typeof payload.orderId === 'string'
    ? payload.orderId.trim()
    : '';
  const finalLocationData =
    payload.finalLocation && typeof payload.finalLocation === 'object'
      ? payload.finalLocation as Record<string, unknown>
      : null;

  if (!orderId) {
    throw new ApiError(400, 'orderId is required.');
  }

  if (!finalLocationData) {
    return {
      finalLocation: null,
      orderId,
    };
  }

  const lat = Number(finalLocationData.lat);
  const lng = Number(finalLocationData.lng);
  const accuracy = Number(finalLocationData.accuracy);

  return {
    orderId,
    finalLocation:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? {
            accuracy: Number.isFinite(accuracy) ? accuracy : null,
            lat,
            lng,
          }
        : null,
  };
};

const isAssignedAgentPhone = (order: StoredOrderRecord, phone: string) => {
  const normalizedPhone = phone.trim();
  return normalizedPhone && [
    order.assignedAgentId,
    order.deliveryAgentId,
    order.agentId,
    order.delivery_agent_id,
    order.assignedAgentPhone,
    order.deliveryAgentPhone,
    order.agentPhone,
    order.delivery_agent_phone,
  ].some(value => `${value || ''}`.trim() === normalizedPhone);
};

const parseLocation = (value: unknown): DeliveryLocationPayload | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  const accuracy = Number(data.accuracy);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    lat,
    lng,
  };
};

const parseDeliveryTrackingBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const orderDocId = typeof payload.orderDocId === 'string'
    ? payload.orderDocId.trim()
    : '';
  const orderId = typeof payload.orderId === 'string'
    ? payload.orderId.trim().toUpperCase()
    : '';
  const agentId = typeof payload.agentId === 'string'
    ? payload.agentId.trim().toLowerCase()
    : '';
  const agentName = typeof payload.agentName === 'string'
    ? payload.agentName.trim()
    : '';

  if (!orderDocId && !orderId) {
    throw new ApiError(400, 'orderDocId or orderId is required.');
  }

  if (!orderId) {
    throw new ApiError(400, 'orderId is required.');
  }

  if (!agentId) {
    throw new ApiError(400, 'agentId is required.');
  }

  return {
    agentId,
    agentName,
    customerLocation: parseLocation(payload.customerLocation),
    location: parseLocation(payload.location),
    orderDocId,
    orderId,
  };
};

const getAssignedAgentValues = (order: StoredOrderRecord) => [
  order.assignedAgentId,
  order.deliveryAgentId,
  order.agentId,
  order.delivery_agent_id,
  order.assignedAgentPhone,
  order.deliveryAgentPhone,
  order.agentPhone,
  order.delivery_agent_phone,
]
  .map(value => `${value || ''}`.trim())
  .filter(Boolean);

const resolveLegacyPostAction = (request: VercelRequest): OrderMutationAction | 'create' | '' => {
  const action = (getQueryValue(request.query.action) || '').trim().toLowerCase();
  if (!action) {
    return '';
  }

  if (action === 'create') {
    return 'create';
  }

  if (ORDER_MUTATION_ACTIONS.has(action as OrderMutationAction)) {
    return action as OrderMutationAction;
  }

  throw new ApiError(400, 'Unsupported orders action.');
};

const updateOrderStatusResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const verifiedRequest = await requireAdminRequest(request);
  const { orderId, rejectionReason, status } = parseOrderStatusUpdateBody(request.body);
  const adminDb = getServerDb();
  const requestRole = await getUserRole(adminDb, verifiedRequest.phone || '');
  const orderRef = await resolveOrderReferenceByIdentifier(adminDb, orderId);
  let previousStatus: OrderStatusCode | null = null;
  let assignedAgentId = '';
  let orderUserId = '';

  await adminDb.runTransaction(async transaction => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new ApiError(404, 'Order not found.');
    }

    const currentOrder = orderSnapshot.data() as StoredOrderRecord;
    const currentStatus = resolveCurrentOrderStatus(currentOrder);
    previousStatus = currentStatus;
    orderUserId = `${currentOrder.userId || ''}`.trim();

    if (currentStatus === status) {
      throw new ApiError(409, 'Order is already in that status.');
    }

    if (isTerminalOrderStatus(currentStatus)) {
      throw new ApiError(409, 'Delivered or rejected orders cannot be modified.');
    }

    if (!isValidOrderStatusTransition(currentStatus, status)) {
      throw new ApiError(409, `Invalid transition from ${currentStatus} to ${status}.`);
    }

    logStatusTransition({
      from: currentStatus,
      to: status,
      userRole: requestRole,
    });

    assignedAgentId = (
      currentOrder.assignedAgentId ||
      currentOrder.deliveryAgentId ||
      currentOrder.agentId ||
      currentOrder.delivery_agent_id ||
      ''
    ).trim();
    const assignedAgentName = (
      currentOrder.assignedAgentName ||
      currentOrder.deliveryAgentName ||
      currentOrder.agentName ||
      currentOrder.delivery_agent_name ||
      ''
    ).trim();
    const assignedAgentPhone = (
      currentOrder.assignedAgentPhone ||
      currentOrder.deliveryAgentPhone ||
      currentOrder.agentPhone ||
      currentOrder.delivery_agent_phone ||
      ''
    ).trim();
    const assignedAgentEmail = (
      currentOrder.assignedAgentEmail ||
      currentOrder.deliveryAgentEmail ||
      currentOrder.agentEmail ||
      currentOrder.delivery_agent_email ||
      ''
    ).trim();
    const assignedAgentVehicle = (
      currentOrder.assignedAgentVehicle ||
      currentOrder.deliveryAgentVehicle ||
      currentOrder.agentVehicle ||
      currentOrder.delivery_agent_vehicle ||
      ''
    ).trim();

    if (status === 'OUT_FOR_DELIVERY' && !assignedAgentId) {
      throw new ApiError(409, 'Assign a delivery agent before dispatching this order.');
    }

    transaction.update(orderRef, buildOrderStatusUpdate(currentOrder, status, rejectionReason));

    if (status === 'OUT_FOR_DELIVERY' && assignedAgentId) {
      transaction.set(
        adminDb.collection('agents').doc(assignedAgentId),
        {
          currentOrderId: orderRef.id,
          status: 'busy',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        adminDb.collection('delivery_sessions').doc(orderRef.id),
        {
          agentEmail: assignedAgentEmail,
          agentId: assignedAgentId,
          agentName: assignedAgentName,
          agentPhone: assignedAgentPhone,
          agentVehicle: assignedAgentVehicle,
          orderDocId: orderRef.id,
          orderId: (currentOrder.orderId || orderRef.id).toUpperCase(),
          status: 'assigned',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (status === 'DELIVERED' && assignedAgentId) {
      transaction.set(
        adminDb.collection('agents').doc(assignedAgentId),
        {
          currentOrderId: '',
          status: 'active',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        adminDb.collection('delivery_sessions').doc(orderRef.id),
        {
          completedAt: FieldValue.serverTimestamp(),
          orderDocId: orderRef.id,
          orderId: (currentOrder.orderId || orderRef.id).toUpperCase(),
          status: 'completed',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  const updatedOrderSnapshot = await orderRef.get();
  if (!updatedOrderSnapshot.exists) {
    throw new Error('Order was updated but could not be reloaded.');
  }

  const updatedOrder = mapOrderSnapshotToResponse(updatedOrderSnapshot as QueryDocumentSnapshot);

  try {
    await sendLifecycleNotificationsForStatusTransition({
      adminDb,
      assignedAgentId,
      fromStatus: previousStatus || status,
      orderId: updatedOrder.id,
      rejectionReason,
      toStatus: status,
      userId: updatedOrder.user_id || orderUserId,
    });
  } catch (notificationError) {
    console.error('Order status updated but notification dispatch failed', notificationError);
  }

  return jsonResponse(200, { order: updatedOrder });
};

const assignAgentResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  await requireAdminRequest(request);
  const { agentId, orderId } = parseAssignAgentBody(request.body);
  const adminDb = getServerDb();
  const orderRef = await resolveOrderReferenceByIdentifier(adminDb, orderId);

  await adminDb.runTransaction(async transaction => {
    const [orderSnapshot, agentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(adminDb.collection('agents').doc(agentId)),
    ]);

    if (!orderSnapshot.exists) {
      throw new ApiError(404, 'Order not found.');
    }

    if (!agentSnapshot.exists) {
      throw new ApiError(404, 'Selected delivery agent does not exist.');
    }

    const orderData = orderSnapshot.data() as StoredOrderRecord;
    const currentStatus = resolveCurrentOrderStatus(orderData);

    if (currentStatus !== 'PREPARING') {
      throw new ApiError(409, 'Only preparing orders can be assigned to a delivery agent.');
    }

    const agentData = agentSnapshot.data() as Record<string, unknown>;
    const agentStatusValue = typeof agentData.status === 'string'
      ? agentData.status.toLowerCase()
      : '';
    const isAgentActive = agentData.isActive !== false;

    if (!isAgentActive || agentStatusValue === 'busy') {
      throw new ApiError(409, 'Selected delivery agent is not available.');
    }

    const previousAgentId = (
      orderData.assignedAgentId ||
      orderData.deliveryAgentId ||
      orderData.delivery_agent_id ||
      ''
    ).trim().toLowerCase();
    const agentName = (agentData.name as string) || '';
    const agentPhone = (agentData.phone as string) || '';
    const agentEmail = (agentData.email as string) || agentId;
    const agentVehicle = (agentData.vehicle as string) || '';
    const orderNumber = `${orderData.orderId || orderRef.id}`.trim().toUpperCase();

    const orderUpdate: Record<string, unknown> = {
      assignedAgentEmail: agentEmail,
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      assignedAgentPhone: agentPhone,
      assignedAgentVehicle: agentVehicle,
      deliveryAgentEmail: agentEmail,
      deliveryAgentId: agentId,
      deliveryAgentName: agentName,
      deliveryAgentPhone: agentPhone,
      deliveryAgentVehicle: agentVehicle,
      delivery_agent_email: agentEmail,
      delivery_agent_id: agentId,
      delivery_agent_name: agentName,
      delivery_agent_phone: agentPhone,
      delivery_agent_vehicle: agentVehicle,
      agentEmail,
      agentId,
      agentName,
      agentPhone,
      agentVehicle,
      orderStatus: 'PREPARING',
      rejectReason: '',
      rejectionReason: '',
      rejection_reason: '',
      cancelledBy: '',
      status: getOrderStatusFirestoreValue('PREPARING'),
      status_code: 'PREPARING',
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    transaction.update(orderRef, orderUpdate);

    transaction.set(
      adminDb.collection('agents').doc(agentId),
      {
        currentOrderId: orderRef.id,
        email: agentEmail,
        isActive: true,
        name: agentName,
        phone: agentPhone,
        status: 'busy',
        vehicle: agentVehicle,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (previousAgentId && previousAgentId !== agentId) {
      transaction.set(
        adminDb.collection('agents').doc(previousAgentId),
        {
          currentOrderId: '',
          status: 'active',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    transaction.set(
      adminDb.collection('delivery_sessions').doc(orderRef.id),
      {
        agentEmail,
        agentId,
        agentName,
        agentPhone,
        agentVehicle,
        completedAt: null,
        customerLocation: orderData.customerLocation || null,
        lastLocation: null,
        orderDocId: orderRef.id,
        orderId: orderNumber,
        startedAt: null,
        status: 'assigned',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.delete(adminDb.collection('agent_locations').doc(orderRef.id));
  });

  const updatedOrderSnapshot = await orderRef.get();
  if (!updatedOrderSnapshot.exists) {
    throw new Error('Order was assigned but could not be reloaded.');
  }

  const updatedOrder = mapOrderSnapshotToResponse(updatedOrderSnapshot as QueryDocumentSnapshot);

  return jsonResponse(200, { order: updatedOrder });
};

const cancelOrderResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const decodedToken = await requireUserRequest(request);
  const { cancellationReason, orderId } = parseCancelOrderBody(request.body);
  const adminDb = getServerDb();
  const orderRef = await resolveOrderReferenceByIdentifier(adminDb, orderId);

  await adminDb.runTransaction(async transaction => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new ApiError(404, 'Order not found.');
    }

    const currentOrder = orderSnapshot.data() as StoredOrderRecord;
    if (currentOrder.userId !== decodedToken.uid) {
      throw new ApiError(403, 'Order access is limited to the order owner.');
    }

    const currentStatus = resolveCurrentOrderStatus(currentOrder);

    if (currentStatus === 'CANCELLED') {
      throw new ApiError(409, 'Order has already been cancelled.');
    }

    if (!isCustomerCancellableOrderStatus(currentStatus)) {
      throw new ApiError(409, 'Order cannot be cancelled at this stage.');
    }

    logStatusTransition({
      from: currentStatus,
      to: 'CANCELLED',
      userRole: 'customer',
    });

    transaction.update(orderRef, {
      cancellationReason,
      cancellation_reason: cancellationReason,
      cancelledAt: FieldValue.serverTimestamp(),
      cancelled_at: FieldValue.serverTimestamp(),
      cancelledBy: 'customer',
      orderStatus: 'CANCELLED',
      rejectReason: '',
      rejectionReason: '',
      rejection_reason: '',
      status: getOrderStatusFirestoreValue('CANCELLED'),
      status_code: 'CANCELLED',
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      'timestamps.cancelledAt': FieldValue.serverTimestamp(),
    });

    const assignedAgentId = resolveAssignedAgentId(currentOrder);
    if (assignedAgentId) {
      transaction.set(
        adminDb.collection('agents').doc(assignedAgentId),
        {
          currentOrderId: '',
          status: 'active',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  const updatedOrderSnapshot = await orderRef.get();
  if (!updatedOrderSnapshot.exists) {
    throw new Error('Order was cancelled but could not be reloaded.');
  }

  const updatedOrder = mapOrderSnapshotToResponse(updatedOrderSnapshot as QueryDocumentSnapshot);
  const assignedAgentId = resolveAssignedAgentId(updatedOrderSnapshot.data() as StoredOrderRecord);

  try {
    const [adminRecipients, agentRecipient] = await Promise.all([
      getAdminRecipients(adminDb),
      assignedAgentId
        ? getAgentRecipient(adminDb, assignedAgentId)
        : Promise.resolve(null),
    ]);

    const notificationTasks: Promise<unknown>[] = [];

    if (adminRecipients.length > 0) {
      notificationTasks.push(
        sendPushNotification(
          adminDb,
          adminRecipients,
          buildAdminOrderCancelledNotification(updatedOrder.id),
        ),
      );
    }

    if (agentRecipient) {
      notificationTasks.push(
        sendPushNotification(
          adminDb,
          [agentRecipient],
          buildAgentOrderCancelledNotification(updatedOrder.id),
        ),
      );
    }

    await Promise.all(notificationTasks);
  } catch (notificationError) {
    console.error('Order cancelled but notification dispatch failed', notificationError);
  }

  return jsonResponse(200, { order: updatedOrder });
};

const completeDeliveryResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const decodedToken = await requireUserRequest(request);
  const { finalLocation, orderId } = parseCompleteDeliveryBody(request.body);
  const adminDb = getServerDb();
  const orderRef = await resolveOrderReferenceByIdentifier(adminDb, orderId);
  const requesterPhone = (decodedToken.phone || '').trim();
  const isAdmin = await userHasAdminAccess({
    email: decodedToken.email,
    phone: requesterPhone,
    uid: decodedToken.uid,
  });
  const requestRole = isAdmin
    ? await getUserRole(adminDb, requesterPhone)
    : 'delivery_agent';
  let orderUserId = '';

  await adminDb.runTransaction(async transaction => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new ApiError(404, 'Order not found.');
    }

    const currentOrder = orderSnapshot.data() as StoredOrderRecord;
    orderUserId = `${currentOrder.userId || ''}`.trim();

    if (!isAdmin && !isAssignedAgentPhone(currentOrder, requesterPhone)) {
      throw new ApiError(403, 'Only the assigned agent or an admin can complete this delivery.');
    }

    const currentStatus = resolveCurrentOrderStatus(currentOrder);
    if (currentStatus !== 'OUT_FOR_DELIVERY') {
      throw new ApiError(409, 'Only out-for-delivery orders can be completed.');
    }

    logStatusTransition({
      from: currentStatus,
      to: 'DELIVERED',
      userRole: requestRole,
    });

    const orderNumber = `${currentOrder.orderId || orderRef.id}`.trim().toUpperCase();

    transaction.update(orderRef, {
      deliveryDeliveredAt: FieldValue.serverTimestamp(),
      delivery_delivered_at: FieldValue.serverTimestamp(),
      deliveredAt: FieldValue.serverTimestamp(),
      cancelledBy: '',
      rejectReason: '',
      rejectionReason: '',
      rejection_reason: '',
      ...(finalLocation
        ? {
            deliveryLocation: {
              ...finalLocation,
              updatedAt: FieldValue.serverTimestamp(),
            },
            delivery_location: {
              ...finalLocation,
              updatedAt: FieldValue.serverTimestamp(),
            },
          }
        : {}),
      orderStatus: 'DELIVERED',
      status: getOrderStatusFirestoreValue('DELIVERED'),
      status_code: 'DELIVERED',
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      'timestamps.deliveredAt': FieldValue.serverTimestamp(),
    });

    transaction.set(
      adminDb.collection('delivery_sessions').doc(orderRef.id),
      {
        completedAt: FieldValue.serverTimestamp(),
        lastLocation: finalLocation
          ? {
              ...finalLocation,
              updatedAt: FieldValue.serverTimestamp(),
            }
          : null,
        orderDocId: orderRef.id,
        orderId: orderNumber,
        status: 'completed',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (currentOrder.assignedAgentId || currentOrder.deliveryAgentId || currentOrder.delivery_agent_id) {
      const agentId = (
        currentOrder.assignedAgentId ||
        currentOrder.deliveryAgentId ||
        currentOrder.delivery_agent_id ||
        ''
      ).trim().toLowerCase();

      transaction.set(
        adminDb.collection('agents').doc(agentId),
        {
          currentOrderId: '',
          ...(finalLocation
            ? {
                currentLocation: {
                  ...finalLocation,
                  updatedAt: FieldValue.serverTimestamp(),
                },
                lastLocation: {
                  ...finalLocation,
                  updatedAt: FieldValue.serverTimestamp(),
                },
              }
            : {}),
          status: 'active',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (finalLocation) {
      transaction.set(
        adminDb.collection('agent_locations').doc(orderRef.id),
        {
          ...finalLocation,
          orderDocId: orderRef.id,
          orderId: orderNumber,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  const updatedOrderSnapshot = await orderRef.get();
  if (!updatedOrderSnapshot.exists) {
    throw new Error('Order was completed but could not be reloaded.');
  }

  const updatedOrder = mapOrderSnapshotToResponse(updatedOrderSnapshot as QueryDocumentSnapshot);

  try {
    await sendLifecycleNotificationsForStatusTransition({
      adminDb,
      fromStatus: 'OUT_FOR_DELIVERY',
      orderId: updatedOrder.id,
      toStatus: 'DELIVERED',
      userId: updatedOrder.user_id || orderUserId,
    });
  } catch (notificationError) {
    console.error('Delivery completed but notification dispatch failed', notificationError);
  }

  return jsonResponse(200, { order: updatedOrder });
};

const updateDeliveryTrackingResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const decodedToken = await requireUserRequest(request);
  const {
    agentId,
    agentName,
    customerLocation,
    location,
    orderDocId,
    orderId,
  } = parseDeliveryTrackingBody(request.body);
  const adminDb = getServerDb();
  const requesterPhone = (decodedToken.phone || '').trim();
  const isAdmin = await userHasAdminAccess({
    email: decodedToken.email,
    phone: requesterPhone,
    uid: decodedToken.uid,
  });
  const orderRef = await resolveOrderReferenceByIdentifier(adminDb, orderDocId || orderId);

  await adminDb.runTransaction(async transaction => {
    const orderSnapshot = await transaction.get(orderRef);

    if (!orderSnapshot.exists) {
      throw new ApiError(404, 'Order not found.');
    }

    const order = orderSnapshot.data() as StoredOrderRecord;
    const assignedAgentValues = getAssignedAgentValues(order);
    const isAssignedAgent =
      assignedAgentValues.includes(agentId) ||
      (requesterPhone ? assignedAgentValues.includes(requesterPhone) : false) ||
      decodedToken.uid === agentId;

    if (!isAdmin && !isAssignedAgent) {
      throw new ApiError(403, 'Only the assigned agent or an admin can update delivery tracking.');
    }

    const storedOrderId = `${order.orderId || ''}`.trim().toUpperCase();
    if (storedOrderId && storedOrderId !== orderId) {
      throw new ApiError(409, 'Delivery tracking payload does not match the stored order.');
    }

    const timestamp = FieldValue.serverTimestamp();
    const trackedLocation = location
      ? {
          ...location,
          updatedAt: timestamp,
        }
      : null;

    transaction.set(
      adminDb.collection('delivery_sessions').doc(orderRef.id),
      {
        agentId,
        agentName: agentName || order.assignedAgentName || order.deliveryAgentName || order.agentName || '',
        customerLocation: customerLocation ?? order.customerLocation ?? null,
        ...(trackedLocation ? { lastLocation: trackedLocation } : {}),
        orderDocId: orderRef.id,
        orderId,
        startedAt: timestamp,
        status: 'active',
        updatedAt: timestamp,
      },
      { merge: true },
    );

    transaction.set(
      adminDb.collection('agents').doc(agentId),
      {
        currentOrderId: orderRef.id,
        isActive: true,
        ...(trackedLocation
          ? {
              currentLocation: trackedLocation,
              lastLocation: trackedLocation,
            }
          : {}),
        status: 'busy',
        updatedAt: timestamp,
      },
      { merge: true },
    );

    if (trackedLocation) {
      transaction.set(
        adminDb.collection('agent_locations').doc(orderRef.id),
        {
          ...location,
          agentId,
          orderDocId: orderRef.id,
          orderId,
          updatedAt: timestamp,
        },
        { merge: true },
      );

      transaction.set(
        orderRef,
        {
          deliveryLocation: trackedLocation,
          updatedAt: timestamp,
          updated_at: timestamp,
        },
        { merge: true },
      );
    }
  });

  return jsonResponse(200, { success: true });
};

export const getOrdersResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const scope = (getQueryValue(request.query.scope) || 'mine').trim().toLowerCase();
  const orderId = (getQueryValue(request.query.orderId) || '').trim();
  const statusFilter = normalizeStatusFilter(getQueryValue(request.query.status) || '');
  const limit = parseLimit(getQueryValue(request.query.limit), 25);
  const adminDb = getServerDb();

  if (scope === 'all') {
    await requireAdminRequest(request);

    if (orderId) {
      const orderSnapshot = await loadOrderSnapshotByIdentifier(adminDb, orderId);
      const orders = orderSnapshot
        ? [mapOrderSnapshotToResponse(orderSnapshot)]
        : [];

      return jsonResponse(
        200,
        { orders },
        { 'Cache-Control': 'private, no-store' },
      );
    }

    const orderSnapshot = await adminDb
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const orders = orderSnapshot.docs
      .map(mapOrderSnapshotToResponse)
      .filter(order => matchesStatusFilter(order, statusFilter));

    return jsonResponse(
      200,
      { orders },
      { 'Cache-Control': 'private, no-store' },
    );
  }

  if (scope !== 'mine') {
    throw new ApiError(400, 'Unsupported orders scope.');
  }

  const resolvedUser = await requireUserRequest(request);
  const effectiveUserId = resolvedUser.uid;

  if (orderId) {
    const orderSnapshot = await loadOrderSnapshotByIdentifier(adminDb, orderId);
    if (!orderSnapshot) {
      return jsonResponse(
        200,
        { orders: [] },
        { 'Cache-Control': 'private, no-store' },
      );
    }

    const order = mapOrderSnapshotToResponse(orderSnapshot);
    if (order.user_id !== effectiveUserId) {
      throw new ApiError(403, 'Order access is limited to the order owner.');
    }

    return jsonResponse(
      200,
      { orders: [order] },
      { 'Cache-Control': 'private, no-store' },
    );
  }

  const orderSnapshot = await adminDb.collection('orders').where('userId', '==', effectiveUserId).get();
  const orders = orderSnapshot.docs
    .map(mapOrderSnapshotToResponse)
    .filter(order => matchesStatusFilter(order, statusFilter))
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, limit);

  return jsonResponse(
    200,
    { orders },
    { 'Cache-Control': 'private, no-store' },
  );
};

export const createOrderResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const decodedToken = await requireUserRequest(request);
  const { orderDraft } = parseCreateOrderBody(request.body);
  const effectiveUserId = decodedToken.uid;
  const effectiveEmail = (decodedToken.email || '').trim().toLowerCase();

  const adminDb = getServerDb();
  await assertShopIsOpen(adminDb);
  const pricing = await recalculatePricing(adminDb, orderDraft);
  assertPricingMatches(orderDraft, pricing);

  const storedOrder = buildStoredOrderRecord(
    orderDraft,
    pricing,
    effectiveUserId,
    effectiveEmail,
  );
  const { orderNumber, orderRef } = await createOrderWithNextNumber(adminDb, storedOrder);

  const createdOrderSnapshot = await orderRef.get();
  if (!createdOrderSnapshot.exists) {
    throw new Error('Order was created, but could not be loaded afterwards.');
  }

  const order = mapOrderSnapshotToResponse(createdOrderSnapshot as QueryDocumentSnapshot);

  try {
    const adminRecipients = await getAdminRecipients(adminDb);

    if (adminRecipients.length > 0) {
      await sendPushNotification(
        adminDb,
        adminRecipients,
        buildAdminNewOrderNotification(order.id),
      );
    }
  } catch (notificationError) {
    console.error('Order created but notification dispatch failed', notificationError);
  }

  return jsonResponse(200, {
    success: true,
    order,
    orderNumber: order.id,
    numericOrderNumber: orderNumber,
  });
};

export const updateOrderMutationResponse = async (
  action: OrderMutationAction,
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  switch (action) {
    case 'assign-agent':
      return assignAgentResponse(request);
    case 'cancel':
      return cancelOrderResponse(request);
    case 'complete-delivery':
      return completeDeliveryResponse(request);
    case 'update-delivery-tracking':
      return updateDeliveryTrackingResponse(request);
    case 'update-status':
      return updateOrderStatusResponse(request);
    default:
      throw new ApiError(400, 'Unsupported orders action.');
  }
};

export const handleLegacyOrCreatePostResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const action = resolveLegacyPostAction(request);

  if (!action || action === 'create') {
    return createOrderResponse(request);
  }

  return updateOrderMutationResponse(action, request);
};

export const getOrderMutationAction = (request: VercelRequest) => {
  const action = (getQueryValue(request.query.action) || '').trim().toLowerCase();

  if (!ORDER_MUTATION_ACTIONS.has(action as OrderMutationAction)) {
    throw new ApiError(400, 'Unsupported orders action.');
  }

  return action as OrderMutationAction;
};
