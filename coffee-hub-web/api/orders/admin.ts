import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import { getAdminDb, verifyAdminRequest } from '../_lib/firebaseAdmin.js';
import {
  mapOrderRecordToResponse,
  type StoredOrderRecord,
} from '../_lib/responseMappers.js';
import { normalizeOrderStatusCode } from '../../shared/orderStatus.js';

const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseLimit = (value: string | undefined) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(Math.floor(parsed), 100);
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled admin orders error', error);
  response.status(500).json({ error: 'Unable to load admin orders right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  response.setHeader('Cache-Control', 'private, no-store');

  try {
    await verifyAdminRequest(request);

    const statusFilter = getQueryValue(request.query.status);
    const limit = parseLimit(getQueryValue(request.query.limit));
    const snapshot = await getAdminDb()
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const normalizedStatusFilter = statusFilter ? normalizeOrderStatusCode(statusFilter) : null;
    const orders = snapshot.docs
      .map(doc => mapOrderRecordToResponse(doc.id, doc.data() as StoredOrderRecord))
      .filter(order => !normalizedStatusFilter || order.status_code === normalizedStatusFilter);

    response.status(200).json({ orders });
  } catch (error) {
    sendError(response, error);
  }
}
