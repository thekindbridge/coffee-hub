import type {
  GetShopTimingResponse,
  UpdateShopTimingResponse,
} from '../../types';
import { getApi, postApi } from './apiClient';

export const getShopTimingRequest = () =>
  getApi<GetShopTimingResponse>('/api/shop/timing');

export const updateShopTimingRequest = (
  params: {
    openTime: string;
    closeTime: string;
  },
  idToken: string,
) => postApi<UpdateShopTimingResponse>('/api/admin/update-shop-timing', params, idToken);
