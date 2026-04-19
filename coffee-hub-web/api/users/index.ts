import type { VercelRequest, VercelResponse } from '@vercel/node';

import { syncUserProfileResponse } from '../../src/services/api/server/userService.js';
import {
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'POST':
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
