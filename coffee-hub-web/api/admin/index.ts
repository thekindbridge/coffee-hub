import type { VercelRequest, VercelResponse } from '@vercel/node';

import { updateShopTimingResponse } from '../../src/services/api/server/adminService.js';
import {
  isFirebaseUnavailable,
  jsonResponse,
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'POST':
      case 'PUT':
        if (isFirebaseUnavailable()) {
          console.warn('Admin fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, {
            fallback: true,
            message: 'Admin service is temporarily unavailable.',
            success: false,
          }));
        }

        return sendApiResponse(response, await updateShopTimingResponse(request));
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['POST', 'PUT']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Unhandled admin endpoint error',
        'Unable to process the admin request right now.',
      ),
    );
  }
}
