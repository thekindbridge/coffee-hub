import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import {
  getAdminDb,
  hasAdminAccess,
  verifyRequestUser,
} from '../_lib/firebaseAdmin.js';
import type { StoredOrderRecord } from '../_lib/responseMappers.js';

type DeliveryLocationPayload = {
  accuracy: number | null;
  lat: number;
  lng: number;
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

const parseRequestBody = (body: unknown) => {
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

  if (!orderDocId) {
    throw new ApiError(400, 'orderDocId is required.');
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
  order.assignedAgentEmail,
  order.deliveryAgentEmail,
  order.agentEmail,
  order.delivery_agent_email,
]
  .map(value => `${value || ''}`.trim().toLowerCase())
  .filter(Boolean);

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled update-delivery-tracking error', error);
  response.status(500).json({ error: 'Unable to update delivery tracking right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const decodedToken = await verifyRequestUser(request);
    const {
      agentId,
      agentName,
      customerLocation,
      location,
      orderDocId,
      orderId,
    } = parseRequestBody(request.body);
    const adminDb = getAdminDb();
    const requesterEmail = (decodedToken.email || '').trim().toLowerCase();
    const isAdmin = requesterEmail ? await hasAdminAccess(requesterEmail) : false;

    await adminDb.runTransaction(async transaction => {
      const orderRef = adminDb.collection('orders').doc(orderDocId);
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists) {
        throw new ApiError(404, 'Order not found.');
      }

      const order = orderSnapshot.data() as StoredOrderRecord;
      const assignedAgentValues = getAssignedAgentValues(order);
      const isAssignedAgent =
        assignedAgentValues.includes(agentId) ||
        (requesterEmail ? assignedAgentValues.includes(requesterEmail) : false) ||
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
        adminDb.collection('delivery_sessions').doc(orderDocId),
        {
          agentId,
          agentName: agentName || order.assignedAgentName || order.deliveryAgentName || order.agentName || '',
          customerLocation: customerLocation ?? order.customerLocation ?? null,
          ...(trackedLocation ? { lastLocation: trackedLocation } : {}),
          orderDocId,
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
          currentOrderId: orderDocId,
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
          adminDb.collection('agent_locations').doc(orderDocId),
          {
            ...location,
            agentId,
            orderDocId,
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

    response.status(200).json({ success: true });
  } catch (error) {
    sendError(response, error);
  }
}
