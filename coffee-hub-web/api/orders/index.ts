import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  createOrderResponse,
  getOrderMutationAction,
  getOrdersResponse,
  handleLegacyOrCreatePostResponse,
  updateOrderMutationResponse,
} from '../../src/services/api/server/ordersService.js';
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
          console.warn('Orders fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, { fallback: true, orders: [] }));
        }

        return sendApiResponse(response, await getOrdersResponse(request));
      case 'POST':
        if (isFirebaseUnavailable()) {
          console.warn('Orders create fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, {
            fallback: true,
            message: 'Order service is temporarily unavailable.',
            success: false,
          }));
        }

        return sendApiResponse(response, await handleLegacyOrCreatePostResponse(request));
      case 'PUT':
        if (isFirebaseUnavailable()) {
          console.warn('Orders update fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, {
            fallback: true,
            message: 'Order service is temporarily unavailable.',
            success: false,
          }));
        }

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
