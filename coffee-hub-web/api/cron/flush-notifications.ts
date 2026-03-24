import type { VercelRequest, VercelResponse } from '@vercel/node';

import { flushQueuedNotifications } from '../_lib/notifications.js';
import { getAdminDb } from '../_lib/firebaseAdmin.js';

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

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!isAuthorizedCronRequest(request)) {
    response.status(401).json({ error: 'Unauthorized cron request.' });
    return;
  }

  try {
    const processed = await flushQueuedNotifications(getAdminDb());
    response.status(200).json({ processed });
  } catch (error) {
    console.error('Failed to flush notifications', error);
    response.status(500).json({ error: 'Unable to flush notifications right now.' });
  }
}
