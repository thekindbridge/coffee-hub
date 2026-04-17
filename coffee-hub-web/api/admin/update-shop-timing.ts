import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiError } from '../_lib/errors.js';
import { getAdminDb, verifyAdminRequest } from '../_lib/firebaseAdmin.js';
import { loadShopTiming } from '../_lib/shopTiming.js';
import {
  sanitizeShopTiming,
  validateShopTiming,
} from '../../shared/shopTiming.js';

const parseRequestBody = (body: unknown) => {
  const payload = body && typeof body === 'object'
    ? (body as Record<string, unknown>)
    : {};

  const openTime = typeof payload.openTime === 'string' ? payload.openTime.trim() : '';
  const closeTime = typeof payload.closeTime === 'string' ? payload.closeTime.trim() : '';
  const validationMessage = validateShopTiming(openTime, closeTime);

  if (validationMessage) {
    throw new ApiError(400, validationMessage);
  }

  return sanitizeShopTiming({
    openTime,
    closeTime,
  });
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled update-shop-timing error', error);
  response.status(500).json({ error: 'Unable to update shop timing right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    await verifyAdminRequest(request);

    const parsedTiming = parseRequestBody(request.body);
    if (!parsedTiming) {
      throw new ApiError(400, 'Shop timing must use HH:MM format.');
    }

    const { openTime, closeTime } = parsedTiming;
    const adminDb = getAdminDb();

    await adminDb.collection('settings').doc('shop').set(
      {
        openTime,
        closeTime,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const shopTiming = await loadShopTiming(adminDb);

    response.status(200).json({
      message: 'Shop timing updated successfully.',
      shopTiming,
    });
  } catch (error) {
    sendError(response, error);
  }
}
