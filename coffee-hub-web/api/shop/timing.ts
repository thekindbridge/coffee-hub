import type { VercelRequest, VercelResponse } from '@vercel/node';

import { getShopTimingResponse } from '../../src/services/api/server/shopTimingService.js';
import {
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'GET':
        return sendApiResponse(response, await getShopTimingResponse());
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['GET']));
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
