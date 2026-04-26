import type {
  UpdateShopTimingResponse,
} from '../../types';
import { putApi } from './apiClient';

export const updateShopTimingRequest = (
  params: {
    openTime: string;
    closeTime: string;
  },
  idToken: string,
) => putApi<UpdateShopTimingResponse>('/api/shop/timing', params, idToken);
