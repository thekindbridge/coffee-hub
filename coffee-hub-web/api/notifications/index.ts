import type { VercelRequest, VercelResponse } from '@vercel/node';

import { registerNotificationTokenResponse } from '../../src/services/api/server/notificationsService.js';
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
        if (isFirebaseUnavailable()) {
          console.warn('Notification registration fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, {
            fallback: true,
            success: false,
          }));
        }

        return sendApiResponse(response, await registerNotificationTokenResponse(request));
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['POST']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Unhandled notification registration error',
        'Unable to register notification token right now.',
      ),
    );
  }
}
