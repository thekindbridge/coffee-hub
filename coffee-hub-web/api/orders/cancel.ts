import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import { getAdminDb, verifyRequestUser } from '../_lib/firebaseAdmin.js';
import {
  buildAdminOrderCancelledNotification,
  buildAgentOrderCancelledNotification,
  getAdminRecipients,
  getAgentRecipient,
  sendPushNotification,
} from '../_lib/notifications.js';
import {
  mapOrderRecordToResponse,
  type StoredOrderRecord,
} from '../_lib/responseMappers.js';
import {
  isCustomerCancellableOrderStatus,
  getOrderStatusFirestoreValue,
  normalizeOrderStatusCode,
} from '../../shared/orderStatus.js';

const MAX_CANCELLATION_REASON_LENGTH = 160;

const parseRequestBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const orderId = typeof payload.orderId === 'string'
    ? payload.orderId.trim().toUpperCase()
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

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled cancel-order error', error);
  response.status(500).json({ error: 'Unable to cancel the order right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const decodedToken = await verifyRequestUser(request);
    const { cancellationReason, orderId } = parseRequestBody(request.body);
    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);

    await adminDb.runTransaction(async transaction => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) {
        throw new ApiError(404, 'Order not found.');
      }

      const currentOrder = orderSnapshot.data() as StoredOrderRecord;
      if (currentOrder.userId !== decodedToken.uid) {
        throw new ApiError(403, 'Order access is limited to the order owner.');
      }

      const currentStatus = normalizeOrderStatusCode(
        currentOrder.status ?? currentOrder.orderStatus,
      );

      if (currentStatus === 'CANCELLED') {
        throw new ApiError(409, 'Order has already been cancelled.');
      }

      if (!isCustomerCancellableOrderStatus(currentStatus)) {
        throw new ApiError(409, 'Order cannot be cancelled at this stage.');
      }

      transaction.update(orderRef, {
        cancellationReason,
        cancellation_reason: cancellationReason,
        cancelledAt: FieldValue.serverTimestamp(),
        cancelled_at: FieldValue.serverTimestamp(),
        orderStatus: 'CANCELLED',
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

    const updatedOrder = updatedOrderSnapshot.data() as StoredOrderRecord;
    const assignedAgentId = resolveAssignedAgentId(updatedOrder);

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
            buildAdminOrderCancelledNotification(orderId),
          ),
        );
      }

      if (agentRecipient) {
        notificationTasks.push(
          sendPushNotification(
            adminDb,
            [agentRecipient],
            buildAgentOrderCancelledNotification(orderId),
          ),
        );
      }

      await Promise.all(notificationTasks);
    } catch (notificationError) {
      console.error('Order cancelled but notification dispatch failed', notificationError);
    }

    response.status(200).json({
      order: mapOrderRecordToResponse(updatedOrderSnapshot.id, updatedOrder),
    });
  } catch (error) {
    sendError(response, error);
  }
}
