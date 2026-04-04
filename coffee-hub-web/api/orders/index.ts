import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import {
  getAdminDb,
  resolveRequestUser,
  verifyAdminRequest,
} from '../_lib/firebaseAdmin.js';
import {
  mapOrderRecordToResponse,
  type StoredOrderRecord,
} from '../_lib/responseMappers.js';

const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const normalizeStatusFilter = (value: string) =>
  value.trim().toLowerCase().replace(/_/g, ' ');

const parseLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), 100);
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled orders endpoint error', error);
  response.status(500).json({ error: 'Unable to load orders right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  response.setHeader('Cache-Control', 'private, no-store');

  try {
    const scope = (getQueryValue(request.query.scope) || 'mine').trim().toLowerCase();
    const orderId = (getQueryValue(request.query.orderId) || '').trim().toUpperCase();
    const statusFilter = normalizeStatusFilter(getQueryValue(request.query.status) || '');
    const limit = parseLimit(getQueryValue(request.query.limit), 25);
    const adminDb = getAdminDb();

    if (scope === 'all') {
      await verifyAdminRequest(request);

      if (orderId) {
        const orderSnapshot = await adminDb.collection('orders').doc(orderId).get();
        const orders = orderSnapshot.exists
          ? [mapOrderRecordToResponse(orderSnapshot.id, orderSnapshot.data() as StoredOrderRecord)]
          : [];

        response.status(200).json({ orders });
        return;
      }

      const orderSnapshot = await adminDb
        .collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const orders = orderSnapshot.docs
        .map(doc => mapOrderRecordToResponse(doc.id, doc.data() as StoredOrderRecord))
        .filter(order => !statusFilter || order.status.toLowerCase() === statusFilter);

      response.status(200).json({ orders });
      return;
    }

    if (scope !== 'mine') {
      throw new ApiError(400, 'Unsupported orders scope.');
    }

    const requestedUserId = (getQueryValue(request.query.userId) || '').trim();
    const resolvedUser = await resolveRequestUser(request, requestedUserId || undefined);
    if (requestedUserId && requestedUserId !== resolvedUser.uid) {
      throw new ApiError(403, 'Authenticated user does not match the requested order owner.');
    }

    const effectiveUserId = requestedUserId || resolvedUser.uid;

    if (orderId) {
      const orderSnapshot = await adminDb.collection('orders').doc(orderId).get();
      if (!orderSnapshot.exists) {
        response.status(200).json({ orders: [] });
        return;
      }

      const order = mapOrderRecordToResponse(orderSnapshot.id, orderSnapshot.data() as StoredOrderRecord);
      if (order.user_id !== effectiveUserId) {
        throw new ApiError(403, 'Order access is limited to the order owner.');
      }

      response.status(200).json({ orders: [order] });
      return;
    }

    const orderSnapshot = await adminDb.collection('orders').where('userId', '==', effectiveUserId).get();
    const orders = orderSnapshot.docs
      .map(doc => mapOrderRecordToResponse(doc.id, doc.data() as StoredOrderRecord))
      .filter(order => !statusFilter || order.status.toLowerCase() === statusFilter)
      .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
      .slice(0, limit);

    response.status(200).json({ orders });
  } catch (error) {
    sendError(response, error);
  }
}
