import type { DeliveryLocation } from '../../types';
import {
  clearBrowserLocationSubscription,
  getCurrentBrowserLocation,
  isBrowserGeolocationSupported,
  queryBrowserGeolocationPermission,
  subscribeToBrowserLocation,
} from '../browser/geolocationService';

export type LocationPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported'
  | 'unavailable';

export type LocationRequestOptions = {
  enableHighAccuracy?: boolean;
  maximumAgeMs?: number;
  timeoutMs?: number;
};

export type LocationAdapterErrorCode =
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unsupported'
  | 'unknown';

export class LocationAdapterError extends Error {
  readonly code: LocationAdapterErrorCode;

  constructor(message: string, code: LocationAdapterErrorCode) {
    super(message);
    this.name = 'LocationAdapterError';
    this.code = code;
  }
}

export interface LocationAdapter {
  clearWatch(watchId: number): void;
  getCurrentLocation(options?: LocationRequestOptions): Promise<DeliveryLocation>;
  isSupported(): boolean;
  queryPermission(): Promise<LocationPermissionState>;
  watchLocation(params: {
    onError: (error: LocationAdapterError) => void;
    onLocation: (location: DeliveryLocation) => void;
    options?: LocationRequestOptions;
  }): number | null;
}

export const locationAdapter: LocationAdapter = {
  clearWatch: clearBrowserLocationSubscription,
  getCurrentLocation: getCurrentBrowserLocation,
  isSupported: isBrowserGeolocationSupported,
  queryPermission: queryBrowserGeolocationPermission,
  watchLocation: subscribeToBrowserLocation,
};
