import type { VercelRequest, VercelResponse } from '@vercel/node';

import { flushNotificationsResponse } from '../../src/services/api/server/notificationsService.js';
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
      case 'GET':
        if (isFirebaseUnavailable()) {
          console.warn('Flush notifications fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, {
            fallback: true,
            processed: 0,
          }));
        }

        return sendApiResponse(response, await flushNotificationsResponse(request));
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['GET']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Failed to flush notifications',
        'Unable to flush notifications right now.',
      ),
    );
  }
}
