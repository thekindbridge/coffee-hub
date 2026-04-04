import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from './_lib/errors.js';
import { getAdminDb, verifyAdminRequest } from './_lib/firebaseAdmin.js';
import { loadShopTiming } from './_lib/shopTiming.js';
import { mapMenuRecordToResponse } from './_lib/responseMappers.js';

const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled menu endpoint error', error);
  response.status(500).json({ error: 'Unable to load the menu right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const wantsShopTiming =
      getQueryValue(request.query.shopTiming)?.trim().toLowerCase() === 'true';

    if (wantsShopTiming) {
      const shopTiming = await loadShopTiming(getAdminDb());
      response.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      response.status(200).json(shopTiming);
      return;
    }

    const includeUnavailable =
      getQueryValue(request.query.includeUnavailable)?.trim().toLowerCase() === 'true';

    if (includeUnavailable) {
      await verifyAdminRequest(request);
      response.setHeader('Cache-Control', 'private, no-store');
    } else {
      response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    }

    const snapshot = await getAdminDb().collection('menu_items').get();
    const menu = snapshot.docs
      .map(doc => mapMenuRecordToResponse(doc.id, doc.data() as Record<string, unknown>))
      .filter(item => includeUnavailable || item.is_available)
      .sort((left, right) => (
        left.category.localeCompare(right.category) || left.name.localeCompare(right.name)
      ));

    response.status(200).json({ menu });
  } catch (error) {
    sendError(response, error);
  }
}
