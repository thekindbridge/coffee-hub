import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  createOrderResponse,
  getOrderMutationAction,
  getOrdersResponse,
  handleLegacyOrCreatePostResponse,
  updateOrderMutationResponse,
} from '../../src/services/api/server/ordersService.js';
import {
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'GET':
        return sendApiResponse(response, await getOrdersResponse(request));
      case 'POST':
        return sendApiResponse(response, await handleLegacyOrCreatePostResponse(request));
      case 'PUT':
        return sendApiResponse(
          response,
          await updateOrderMutationResponse(getOrderMutationAction(request), request),
        );
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['GET', 'POST', 'PUT']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Unhandled orders endpoint error',
        'Unable to process the order request right now.',
      ),
    );
  }
}
