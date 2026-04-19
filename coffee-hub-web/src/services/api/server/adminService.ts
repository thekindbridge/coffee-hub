import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';

import { ApiError } from '../../../../api/_lib/errors.js';
import { loadShopTiming } from '../../../../api/_lib/shopTiming.js';
import {
  sanitizeShopTiming,
  validateShopTiming,
} from '../../../../shared/shopTiming.js';
import {
  getServerDb,
  requireAdminRequest,
} from './authService.js';
import {
  jsonResponse,
  type ApiServiceResponse,
} from './routeUtils.js';

const parseShopTimingBody = (body: unknown) => {
  const payload = body && typeof body === 'object'
    ? body as Record<string, unknown>
    : {};

  const openTime = typeof payload.openTime === 'string' ? payload.openTime.trim() : '';
  const closeTime = typeof payload.closeTime === 'string' ? payload.closeTime.trim() : '';
  const validationMessage = validateShopTiming(openTime, closeTime);

  if (validationMessage) {
    throw new ApiError(400, validationMessage);
  }

  return sanitizeShopTiming({
    closeTime,
    openTime,
  });
};

export const updateShopTimingResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  await requireAdminRequest(request);

  const parsedTiming = parseShopTimingBody(request.body);
  if (!parsedTiming) {
    throw new ApiError(400, 'Shop timing must use HH:MM format.');
  }

  const { closeTime, openTime } = parsedTiming;
  const adminDb = getServerDb();

  await adminDb.collection('settings').doc('shop').set(
    {
      closeTime,
      openTime,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const shopTiming = await loadShopTiming(adminDb);

  return jsonResponse(200, {
    message: 'Shop timing updated successfully.',
    shopTiming,
  });
};
