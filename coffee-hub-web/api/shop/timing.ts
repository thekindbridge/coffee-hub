import type { VercelRequest, VercelResponse } from '@vercel/node';

import { updateShopTimingResponse } from '../../src/services/api/server/adminService.js';
import { getServerDb } from '../../src/services/api/server/authService.js';
import {
  isFirebaseUnavailable,
  jsonResponse,
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

const DEFAULT_SHOP_TIMING = {
  closeTime: '22:00',
  isOpen: true,
  openTime: '09:00',
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  console.log('API start: /api/shop/timing', request.method || 'UNKNOWN');

  try {
    switch (request.method) {
      case 'GET':
        console.log('Fetching shop timing...');

        if (isFirebaseUnavailable()) {
          console.warn('Shop timing fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, DEFAULT_SHOP_TIMING));
        }

        try {
          const adminDb = getServerDb();
          if (!adminDb) {
            console.warn('Shop timing fallback used: db unavailable');
            return sendApiResponse(response, jsonResponse(200, DEFAULT_SHOP_TIMING));
          }

          const snapshot = await adminDb.collection('settings').doc('shop').get();

          if (!snapshot.exists) {
            console.warn('Shop timing fallback used: doc missing');
            return sendApiResponse(response, jsonResponse(200, DEFAULT_SHOP_TIMING));
          }

          const data = snapshot.data() as Record<string, unknown> | undefined;

          return sendApiResponse(response, jsonResponse(200, {
            closeTime: typeof data?.closeTime === 'string' ? data.closeTime : DEFAULT_SHOP_TIMING.closeTime,
            isOpen: true,
            openTime: typeof data?.openTime === 'string' ? data.openTime : DEFAULT_SHOP_TIMING.openTime,
          }));
        } catch (error) {
          console.error('SHOP TIMING API ERROR:', error);
          console.warn('Shop timing fallback used: exception');
          return sendApiResponse(response, jsonResponse(200, DEFAULT_SHOP_TIMING));
        }
      case 'PUT':
        if (isFirebaseUnavailable()) {
          console.warn('Shop timing update fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, {
            ...DEFAULT_SHOP_TIMING,
            fallback: true,
            message: 'Shop timing update unavailable right now.',
            success: false,
          }));
        }

        return sendApiResponse(response, await updateShopTimingResponse(request));
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['GET', 'PUT']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Unhandled shop timing endpoint error',
        'Unable to load shop timing right now.',
      ),
    );
  }
}
