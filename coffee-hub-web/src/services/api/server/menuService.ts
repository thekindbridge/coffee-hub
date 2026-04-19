import type { VercelRequest } from '@vercel/node';

import { loadShopTiming } from '../../../../api/_lib/shopTiming.js';
import { mapMenuRecordToResponse } from '../../../../api/_lib/responseMappers.js';
import {
  getServerDb,
  requireAdminRequest,
} from './authService.js';
import {
  getQueryValue,
  jsonResponse,
  type ApiServiceResponse,
} from './routeUtils.js';

export const getMenuResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const wantsShopTiming =
    getQueryValue(request.query.shopTiming)?.trim().toLowerCase() === 'true';

  if (wantsShopTiming) {
    const shopTiming = await loadShopTiming(getServerDb());
    return jsonResponse(
      200,
      shopTiming,
      { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    );
  }

  const includeUnavailable =
    getQueryValue(request.query.includeUnavailable)?.trim().toLowerCase() === 'true';

  if (includeUnavailable) {
    await requireAdminRequest(request);
  }

  const snapshot = await getServerDb().collection('menu_items').get();
  const menu = snapshot.docs
    .map(doc => mapMenuRecordToResponse(doc.id, doc.data() as Record<string, unknown>))
    .filter(item => includeUnavailable || item.is_available)
    .sort((left, right) => (
      left.category.localeCompare(right.category) || left.name.localeCompare(right.name)
    ));

  return jsonResponse(
    200,
    { menu },
    {
      'Cache-Control': includeUnavailable
        ? 'private, no-store'
        : 's-maxage=60, stale-while-revalidate=300',
    },
  );
};
