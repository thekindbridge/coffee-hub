import type { UpdateShopTimingResponse } from '../../types';
import { postApi } from './apiClient';

export const updateShopTimingRequest = (
  params: {
    openTime: number;
    closeTime: number;
  },
  idToken: string,
) => postApi<UpdateShopTimingResponse>('/api/admin/update-shop-timing', params, idToken);
