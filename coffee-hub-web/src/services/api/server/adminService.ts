import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';

import { ApiError } from '../../../../api/_lib/errors.js';
import { loadShopTiming } from '../../../../api/_lib/shopTiming.js';
import {
  parseDeliveryCharge,
  sanitizeShopTiming,
  validateDeliveryCharge,
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

const parseDeliveryChargeBody = (body: unknown) => {
  const payload = body && typeof body === 'object'
    ? body as Record<string, unknown>
    : {};
  const rawDeliveryCharge = typeof payload.deliveryCharge === 'number'
    ? `${payload.deliveryCharge}`
    : typeof payload.deliveryCharge === 'string'
      ? payload.deliveryCharge.trim()
      : '';
  const validationMessage = validateDeliveryCharge(rawDeliveryCharge);

  if (validationMessage) {
    throw new ApiError(400, validationMessage);
  }

  const deliveryCharge = parseDeliveryCharge(rawDeliveryCharge);
  if (deliveryCharge === null) {
    throw new ApiError(400, 'Delivery charge must be a valid non-negative amount.');
  }

  return deliveryCharge;
};

export const updateShopTimingResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  await requireAdminRequest(request);
  const requestBody = request.body && typeof request.body === 'object'
    ? request.body as Record<string, unknown>
    : {};
  const adminDb = getServerDb();
  const hasTimingPayload =
    Object.prototype.hasOwnProperty.call(requestBody, 'openTime') ||
    Object.prototype.hasOwnProperty.call(requestBody, 'closeTime');
  const hasDeliveryChargePayload =
    Object.prototype.hasOwnProperty.call(requestBody, 'deliveryCharge');

  if (!hasTimingPayload && !hasDeliveryChargePayload) {
    throw new ApiError(400, 'Provide shop timing or delivery charge to update.');
  }

  const nextUpdate: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  let successMessage = 'Shop settings updated successfully.';

  if (hasTimingPayload) {
    const parsedTiming = parseShopTimingBody(requestBody);
    if (!parsedTiming) {
      throw new ApiError(400, 'Shop timing must use HH:MM format.');
    }

    nextUpdate.closeTime = parsedTiming.closeTime;
    nextUpdate.openTime = parsedTiming.openTime;
    successMessage = 'Shop timing updated successfully.';
  }

  if (hasDeliveryChargePayload) {
    nextUpdate.deliveryCharge = parseDeliveryChargeBody(requestBody);
    successMessage = hasTimingPayload
      ? 'Shop settings updated successfully.'
      : 'Delivery charge updated successfully.';
  }

  await adminDb.collection('settings').doc('shop').set(nextUpdate, { merge: true });

  const shopTiming = await loadShopTiming(adminDb);

  return jsonResponse(200, {
    message: successMessage,
    shopTiming,
  });
};
