import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import {
  getAdminDb,
  hasAdminAccess,
  verifyRequestUser,
} from '../_lib/firebaseAdmin.js';
import {
  buildCustomerOrderNotification,
  getCustomerRecipient,
  sendPushNotification,
} from '../_lib/notifications.js';
import {
  mapOrderRecordToResponse,
  type StoredOrderRecord,
} from '../_lib/responseMappers.js';
import { getOrderStatusFirestoreValue } from '../../shared/orderStatus.js';

const parseRequestBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const orderId = typeof payload.orderId === 'string'
    ? payload.orderId.trim().toUpperCase()
    : '';
  const finalLocationData =
    payload.finalLocation && typeof payload.finalLocation === 'object'
      ? (payload.finalLocation as Record<string, unknown>)
      : null;

  if (!orderId) {
    throw new ApiError(400, 'orderId is required.');
  }

  if (!finalLocationData) {
    return {
      orderId,
      finalLocation: null,
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

const isAssignedAgentEmail = (order: StoredOrderRecord, email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail && [
    order.assignedAgentEmail,
    order.deliveryAgentEmail,
    order.agentEmail,
    order.assignedAgentId,
    order.deliveryAgentId,
    order.delivery_agent_id,
  ].some(value => `${value || ''}`.trim().toLowerCase() === normalizedEmail);
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled complete-delivery error', error);
  response.status(500).json({ error: 'Unable to complete delivery right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const decodedToken = await verifyRequestUser(request);
    const { finalLocation, orderId } = parseRequestBody(request.body);
    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);

    await adminDb.runTransaction(async transaction => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) {
        throw new ApiError(404, 'Order not found.');
      }

      const currentOrder = orderSnapshot.data() as StoredOrderRecord;
      const requesterEmail = (decodedToken.email || '').trim().toLowerCase();
      const isAdmin = await hasAdminAccess(requesterEmail);

      if (!isAdmin && !isAssignedAgentEmail(currentOrder, requesterEmail)) {
        throw new ApiError(403, 'Only the assigned agent or an admin can complete this delivery.');
      }

      const currentStatus = `${currentOrder.status || currentOrder.orderStatus || ''}`
        .trim()
        .toUpperCase();
      if (currentStatus !== 'OUT_FOR_DELIVERY') {
        throw new ApiError(409, 'Only out-for-delivery orders can be completed.');
      }

      transaction.update(orderRef, {
        deliveryDeliveredAt: FieldValue.serverTimestamp(),
        delivery_delivered_at: FieldValue.serverTimestamp(),
        deliveredAt: FieldValue.serverTimestamp(),
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
        adminDb.collection('delivery_sessions').doc(orderId),
        {
          completedAt: FieldValue.serverTimestamp(),
          lastLocation: finalLocation
            ? {
                ...finalLocation,
                updatedAt: FieldValue.serverTimestamp(),
              }
            : null,
          orderDocId: orderId,
          orderId,
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
          adminDb.collection('agent_locations').doc(orderId),
          {
            ...finalLocation,
            orderDocId: orderId,
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

    const updatedOrder = updatedOrderSnapshot.data() as StoredOrderRecord;
    try {
      if (updatedOrder.userId) {
        const customerRecipient = await getCustomerRecipient(adminDb, updatedOrder.userId);
        if (customerRecipient) {
          await sendPushNotification(
            adminDb,
            [customerRecipient],
            buildCustomerOrderNotification({
              orderId,
              status: 'DELIVERED',
            }),
          );
        }
      }
    } catch (notificationError) {
      console.error('Delivery completed but notification dispatch failed', notificationError);
    }

    response.status(200).json({
      order: mapOrderRecordToResponse(orderId, updatedOrder),
    });
  } catch (error) {
    sendError(response, error);
  }
}
