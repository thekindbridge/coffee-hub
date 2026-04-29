import type { VercelRequest, VercelResponse } from '@vercel/node';

import { getMenuResponse } from '../src/services/api/server/menuService.js';
import {
  isFirebaseUnavailable,
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
  jsonResponse,
} from '../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'GET':
        if (isFirebaseUnavailable()) {
          console.warn('Menu fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, { fallback: true, menu: [] }));
        }

        return sendApiResponse(response, await getMenuResponse(request));
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['GET']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Unhandled menu endpoint error',
        'Unable to load the menu right now.',
      ),
    );
  }
}
