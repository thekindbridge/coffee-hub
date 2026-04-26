import type { VercelRequest, VercelResponse } from '@vercel/node';

import { syncUserProfileResponse } from '../../src/services/api/server/userService.js';
import {
  isFirebaseUnavailable,
  jsonResponse,
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  console.log('API start: /api/users', request.method || 'UNKNOWN');

  try {
    switch (request.method) {
      case 'POST':
        if (isFirebaseUnavailable()) {
          console.warn('User profile fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, {
            fallback: true,
            profile: null,
            success: false,
          }));
        }

        return sendApiResponse(response, await syncUserProfileResponse(request));
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['POST']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Unhandled user sync error',
        'Unable to sync your profile right now.',
      ),
    );
  }
}
