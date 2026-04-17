import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import { getAdminDb, verifyAdminRequest } from '../_lib/firebaseAdmin.js';
import {
  buildAgentAssignmentNotification,
  buildCustomerOrderNotification,
  getAgentRecipient,
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
  const agentId = typeof payload.agentId === 'string'
    ? payload.agentId.trim().toLowerCase()
    : '';

  if (!orderId) {
    throw new ApiError(400, 'orderId is required.');
  }

  if (!agentId) {
    throw new ApiError(400, 'agentId is required.');
  }

  return { orderId, agentId };
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled assign-agent error', error);
  response.status(500).json({ error: 'Unable to assign delivery agent right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    await verifyAdminRequest(request);
    const { orderId, agentId } = parseRequestBody(request.body);
    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);

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
      const currentStatus = `${orderData.status || orderData.orderStatus || ''}`
        .trim()
        .toUpperCase();

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
        orderStatus: 'OUT_FOR_DELIVERY',
        rejectionReason: '',
        rejection_reason: '',
        status: getOrderStatusFirestoreValue('OUT_FOR_DELIVERY'),
        status_code: 'OUT_FOR_DELIVERY',
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      if (!orderData.assignedAt && !orderData.deliveryAssignedAt) {
        orderUpdate.assignedAt = FieldValue.serverTimestamp();
        orderUpdate.assigned_at = FieldValue.serverTimestamp();
        orderUpdate.deliveryAssignedAt = FieldValue.serverTimestamp();
        orderUpdate.delivery_assigned_at = FieldValue.serverTimestamp();
      }

      if (!orderData.outForDeliveryAt && !orderData.deliveryOutForDeliveryAt) {
        orderUpdate.outForDeliveryAt = FieldValue.serverTimestamp();
        orderUpdate.out_for_delivery_at = FieldValue.serverTimestamp();
        orderUpdate.deliveryOutForDeliveryAt = FieldValue.serverTimestamp();
        orderUpdate.delivery_out_for_delivery_at = FieldValue.serverTimestamp();
        orderUpdate['timestamps.outForDeliveryAt'] = FieldValue.serverTimestamp();
      }

      transaction.update(orderRef, orderUpdate);

      transaction.set(
        adminDb.collection('agents').doc(agentId),
        {
          currentOrderId: orderId,
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
        adminDb.collection('delivery_sessions').doc(orderId),
        {
          agentEmail,
          agentId,
          agentName,
          agentPhone,
          agentVehicle,
          completedAt: null,
          customerLocation: orderData.customerLocation || null,
          lastLocation: null,
          orderDocId: orderId,
          orderId,
          startedAt: null,
          status: 'assigned',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.delete(adminDb.collection('agent_locations').doc(orderId));
    });

    const updatedOrderSnapshot = await orderRef.get();
    if (!updatedOrderSnapshot.exists) {
      throw new Error('Order was assigned but could not be reloaded.');
    }

    const updatedOrder = updatedOrderSnapshot.data() as StoredOrderRecord;

    try {
      const [customerRecipient, agentRecipient] = await Promise.all([
        updatedOrder.userId
          ? getCustomerRecipient(adminDb, updatedOrder.userId)
          : Promise.resolve(null),
        getAgentRecipient(adminDb, agentId),
      ]);

      if (customerRecipient) {
        await sendPushNotification(
          adminDb,
          [customerRecipient],
          buildCustomerOrderNotification({
            orderId,
            status: 'OUT_FOR_DELIVERY',
          }),
        );
      }

      if (agentRecipient) {
        await sendPushNotification(
          adminDb,
          [agentRecipient],
          buildAgentAssignmentNotification(orderId),
        );
      }
    } catch (notificationError) {
      console.error('Agent assigned but notification dispatch failed', notificationError);
    }

    response.status(200).json({
      order: mapOrderRecordToResponse(orderId, updatedOrder),
    });
  } catch (error) {
    sendError(response, error);
  }
}
