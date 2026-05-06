import type { VercelRequest } from '@vercel/node';

import { ApiError } from '../../../../api/_lib/errors.js';
import {
  flushQueuedNotifications,
  type NotificationTokenPlatform,
  syncNotificationRegistration,
} from '../../../../api/_lib/notifications.js';
import {
  getServerDb,
  requireUserRequest,
} from './authService.js';
import {
  jsonResponse,
  type ApiServiceResponse,
} from './routeUtils.js';

const parseRegistrationBody = (body: unknown) => {
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
  const platform: NotificationTokenPlatform = payload.platform === 'android'
    ? 'android'
    : 'web';
  const deviceName = typeof payload.deviceName === 'string'
    ? payload.deviceName.trim().slice(0, 160)
    : '';

  if (!permission || !['default', 'denied', 'granted'].includes(permission)) {
    throw new ApiError(400, 'permission must be default, denied, or granted.');
  }

  return {
    deviceName,
    permission: permission as 'default' | 'denied' | 'granted',
    platform,
    token,
    tokenType,
  };
};

const isAuthorizedCronRequest = (request: VercelRequest) => {
  const configuredSecret = (process.env.CRON_SECRET || '').trim();
  const authorizationHeader = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization || '';
  const bearerToken = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length).trim()
    : '';

  if (configuredSecret) {
    return bearerToken === configuredSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return typeof request.headers['x-vercel-cron'] === 'string';
};

export const registerNotificationTokenResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const {
    deviceName,
    permission,
    platform,
    token,
    tokenType,
  } = parseRegistrationBody(request.body);
  const resolvedUser = await requireUserRequest(request);

  await syncNotificationRegistration(getServerDb(), {
    deviceName,
    permission,
    phone: resolvedUser.phone || '',
    platform,
    token,
    tokenType,
    userId: resolvedUser.uid,
  });

  return jsonResponse(200, { success: true });
};

export const flushNotificationsResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  if (!isAuthorizedCronRequest(request)) {
    return jsonResponse(401, { error: 'Unauthorized cron request.' });
  }

  const processed = await flushQueuedNotifications(getServerDb());
  return jsonResponse(200, { processed });
};
