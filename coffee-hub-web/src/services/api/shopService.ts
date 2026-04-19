import type {
  GetShopTimingResponse,
  UpdateShopTimingResponse,
} from '../../types';
import { getApi, putApi } from './apiClient';

export const getShopTimingRequest = () =>
  getApi<GetShopTimingResponse>('/api/shop/timing');

export const updateShopTimingRequest = (
  params: {
    openTime: string;
    closeTime: string;
  },
  idToken: string,
) => putApi<UpdateShopTimingResponse>('/api/admin?action=shop-timing', params, idToken);
