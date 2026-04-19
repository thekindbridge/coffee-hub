import type { VercelRequest, VercelResponse } from '@vercel/node';

import { updateShopTimingResponse } from '../../src/services/api/server/adminService.js';
import {
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'POST':
      case 'PUT':
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
