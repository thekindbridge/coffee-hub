import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import { getAdminDb, verifyRequestUser } from '../_lib/firebaseAdmin.js';
import { syncNotificationRegistration } from '../_lib/notifications.js';

const parseRequestBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  const permission = typeof payload.permission === 'string'
    ? payload.permission.trim()
    : '';
  const token = typeof payload.token === 'string'
    ? payload.token.trim()
    : '';
  const tokenType: 'expo' | 'fcm' = payload.tokenType === 'expo' ? 'expo' : 'fcm';

  if (!permission || !['default', 'denied', 'granted'].includes(permission)) {
    throw new ApiError(400, 'permission must be default, denied, or granted.');
  }

  return {
    permission: permission as 'default' | 'denied' | 'granted',
    token,
    tokenType,
  };
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled register-token error', error);
  response.status(500).json({ error: 'Unable to register notification token right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const { permission, token, tokenType } = parseRequestBody(request.body);
    const resolvedUser = await verifyRequestUser(request);

    await syncNotificationRegistration(getAdminDb(), {
      email: resolvedUser.email || '',
      permission,
      token,
      tokenType,
      userId: resolvedUser.uid,
    });

    response.status(200).json({ success: true });
  } catch (error) {
    sendError(response, error);
  }
}
