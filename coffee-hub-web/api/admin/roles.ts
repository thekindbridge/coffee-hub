import type { VercelRequest, VercelResponse } from '@vercel/node';

import { mutateUserRoleResponse } from '../../src/services/api/server/roleService.js';
import {
  isFirebaseUnavailable,
  jsonResponse,
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  console.log('API start: /api/admin/roles', request.method || 'UNKNOWN');

  try {
    switch (request.method) {
      case 'POST':
        if (isFirebaseUnavailable()) {
          console.warn('Role mutation fallback used: Firebase unavailable');
          return sendApiResponse(response, jsonResponse(200, {
            fallback: true,
            message: 'Role service is temporarily unavailable.',
            success: false,
          }));
        }

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
