import type { VercelRequest, VercelResponse } from '@vercel/node';

import { getMenuResponse } from '../src/services/api/server/menuService.js';
import {
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'GET':
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
