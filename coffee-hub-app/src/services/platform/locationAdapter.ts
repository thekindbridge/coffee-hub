import type { DeliveryLocation } from '../../types';

const FALLBACK_LAT = Number(process.env.EXPO_PUBLIC_CHECKOUT_FALLBACK_LAT ?? '15.4803');
const FALLBACK_LNG = Number(process.env.EXPO_PUBLIC_CHECKOUT_FALLBACK_LNG ?? '80.0515');

export const locationAdapter = {
  getCurrentLocation: async (): Promise<DeliveryLocation> => ({
    lat: Number.isFinite(FALLBACK_LAT) ? FALLBACK_LAT : 15.4803,
    lng: Number.isFinite(FALLBACK_LNG) ? FALLBACK_LNG : 80.0515,
    updated_at: new Date().toISOString(),
  }),
};
