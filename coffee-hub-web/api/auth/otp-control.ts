import type { VercelRequest, VercelResponse } from '@vercel/node';

import { reserveOtpRequestResponse } from '../../src/services/api/server/otpControlService.js';
import {
  jsonResponse,
  isFirebaseUnavailable,
  methodNotAllowedResponse,
  sendApiResponse,
  toErrorResponse,
} from '../../src/services/api/server/routeUtils.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    switch (request.method) {
      case 'POST':
        if (isFirebaseUnavailable()) {
          return sendApiResponse(
            response,
            jsonResponse(503, {
              error: 'Unable to send the OTP right now. Please try again.',
            }),
          );
        }

        return sendApiResponse(response, await reserveOtpRequestResponse(request));
      default:
        return sendApiResponse(response, methodNotAllowedResponse(['POST']));
    }
  } catch (error) {
    return sendApiResponse(
      response,
      toErrorResponse(
        error,
        'Unhandled OTP control error',
        'Unable to send the OTP right now. Please try again.',
      ),
    );
  }
}
