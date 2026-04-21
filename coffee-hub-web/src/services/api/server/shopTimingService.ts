import { loadShopTiming } from '../../../../api/_lib/shopTiming.js';
import { getServerDb } from './authService.js';
import {
  jsonResponse,
  type ApiServiceResponse,
} from './routeUtils.js';

export const getShopTimingResponse = async (): Promise<ApiServiceResponse> => {
  const shopTiming = await loadShopTiming(getServerDb());

  return jsonResponse(
    200,
    shopTiming,
    { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
  );
};
