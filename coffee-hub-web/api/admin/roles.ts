import type { VercelRequest, VercelResponse } from '@vercel/node';

import { mutateUserRoleResponse } from '../../src/services/api/server/roleService.js';
import {
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'POST':
        return sendApiResponse(response, await mutateUserRoleResponse(request));
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['POST']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Unhandled role management endpoint error',
        'Unable to process role management right now.',
      ),
    );
  }
}
