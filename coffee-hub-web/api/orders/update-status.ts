import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import { getAdminDb, verifyAdminRequest } from '../_lib/firebaseAdmin.js';
import {
  buildCustomerOrderNotification,
  getCustomerRecipient,
  sendPushNotification,
} from '../_lib/notifications.js';
import {
  mapOrderRecordToResponse,
  type StoredOrderRecord,
} from '../_lib/responseMappers.js';
import {
  getOrderStatusFirestoreValue,
  isTerminalOrderStatus,
  isValidOrderStatusTransition,
  normalizeOrderStatusCode,
  requiresRejectionReason,
  type OrderStatusCode,
} from '../../shared/orderStatus.js';

const parseRequestBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const rawOrderId = payload.orderId;
  const rawStatus = payload.status;
  const rejectionReason = typeof payload.rejectionReason === 'string'
    ? payload.rejectionReason.trim()
    : '';

  if (typeof rawOrderId !== 'string' || !rawOrderId.trim()) {
    throw new ApiError(400, 'orderId is required.');
  }

  if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
    throw new ApiError(400, 'status is required.');
  }

  const orderId = rawOrderId.trim().toUpperCase();
  const status = normalizeOrderStatusCode(rawStatus);

  if (requiresRejectionReason(status) && !rejectionReason) {
    throw new ApiError(400, 'rejectionReason is required when rejecting an order.');
  }

  return {
    orderId,
    status,
    rejectionReason,
  };
};

const buildOrderUpdate = (
  currentOrder: StoredOrderRecord,
  nextStatus: OrderStatusCode,
  rejectionReason: string,
) => {
  const timestampValue = FieldValue.serverTimestamp();
  const update: Record<string, unknown> = {
    status_code: nextStatus,
    status: getOrderStatusFirestoreValue(nextStatus),
    orderStatus: nextStatus,
    rejectionReason: nextStatus === 'REJECTED' ? rejectionReason : '',
    rejection_reason: nextStatus === 'REJECTED' ? rejectionReason : '',
    updatedAt: timestampValue,
    updated_at: timestampValue,
  };

  if (nextStatus === 'ACCEPTED' && !currentOrder.acceptedAt) {
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

  if (nextStatus === 'DELIVERED') {
    if (!currentOrder.deliveredAt && !currentOrder.deliveryDeliveredAt) {
      update.deliveredAt = timestampValue;
      update.delivered_at = timestampValue;
      update.deliveryDeliveredAt = timestampValue;
      update.delivery_delivered_at = timestampValue;
      update['timestamps.deliveredAt'] = timestampValue;
    }
  }

  if (nextStatus === 'REJECTED' && !currentOrder.rejectedAt) {
    update.rejectedAt = timestampValue;
    update.rejected_at = timestampValue;
    update['timestamps.rejectedAt'] = timestampValue;
  }

  return update;
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled update-status error', error);
  response.status(500).json({ error: 'Unable to update order status right now.' });
};

const shouldSendCustomerStatusPush = (status: OrderStatusCode) => (
  status === 'ACCEPTED' ||
  status === 'REJECTED' ||
  status === 'OUT_FOR_DELIVERY' ||
  status === 'DELIVERED'
);

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    await verifyAdminRequest(request);
    const { orderId, status, rejectionReason } = parseRequestBody(request.body);
    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);

    await adminDb.runTransaction(async transaction => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) {
        throw new ApiError(404, 'Order not found.');
      }

      const currentOrder = orderSnapshot.data() as StoredOrderRecord;
      const currentStatus = normalizeOrderStatusCode(currentOrder.status ?? currentOrder.orderStatus);

      if (currentStatus === status) {
        throw new ApiError(409, 'Order is already in that status.');
      }

      if (isTerminalOrderStatus(currentStatus)) {
        throw new ApiError(409, 'Delivered or rejected orders cannot be modified.');
      }

      if (!isValidOrderStatusTransition(currentStatus, status)) {
        throw new ApiError(
          409,
          `Invalid transition from ${currentStatus} to ${status}.`,
        );
      }

      const assignedAgentId = (
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

      transaction.update(orderRef, buildOrderUpdate(currentOrder, status, rejectionReason));

      if (status === 'OUT_FOR_DELIVERY' && assignedAgentId) {
        transaction.set(
          adminDb.collection('agents').doc(assignedAgentId),
          {
            currentOrderId: orderId,
            status: 'busy',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        transaction.set(
          adminDb.collection('delivery_sessions').doc(orderId),
          {
            agentId: assignedAgentId,
            agentName: assignedAgentName,
            agentPhone: assignedAgentPhone,
            agentEmail: assignedAgentEmail,
            agentVehicle: assignedAgentVehicle,
            orderDocId: orderId,
            orderId,
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
          adminDb.collection('delivery_sessions').doc(orderId),
          {
            completedAt: FieldValue.serverTimestamp(),
            orderDocId: orderId,
            orderId,
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

    const updatedOrder = updatedOrderSnapshot.data() as StoredOrderRecord;

    try {
      if (updatedOrder.userId) {
        const customerRecipient = await getCustomerRecipient(adminDb, updatedOrder.userId);

        if (!customerRecipient) {
          console.warn('Skipping push: no notification recipient found for user', updatedOrder.userId);
        } else if (!customerRecipient.pushToken && !customerRecipient.fcmToken) {
          console.warn('Skipping push: missing push token for user', updatedOrder.userId);
        }

        if (customerRecipient && shouldSendCustomerStatusPush(status)) {
          await sendPushNotification(
            adminDb,
            [customerRecipient],
            buildCustomerOrderNotification({
              orderId,
              rejectionReason,
              status,
            }),
          );
        }
      }
    } catch (notificationError) {
      console.error('Order status updated but notification dispatch failed', notificationError);
    }

    response.status(200).json({
      order: mapOrderRecordToResponse(
        updatedOrderSnapshot.id,
        updatedOrder,
      ),
    });
  } catch (error) {
    sendError(response, error);
  }
}
