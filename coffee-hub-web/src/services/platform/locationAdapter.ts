import type { DeliveryLocation } from '../../types';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  clearBrowserLocationSubscription,
  getCurrentBrowserLocation,
  isBrowserGeolocationSupported,
  queryBrowserGeolocationPermission,
  subscribeToBrowserLocation,
} from '../browser/geolocationService';
import {
  checkLocationPermission,
  requestLocationPermission,
} from './permissionService';

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
  clearWatch(watchId: number | string): void;
  getCurrentLocation(options?: LocationRequestOptions): Promise<DeliveryLocation>;
  isSupported(): boolean;
  queryPermission(): Promise<LocationPermissionState>;
  watchLocation(params: {
    onError: (error: LocationAdapterError) => void;
    onLocation: (location: DeliveryLocation) => void;
    options?: LocationRequestOptions;
  }): Promise<number | string | null> | number | null;
}

const isNativeRuntime = () => Capacitor.isNativePlatform();

const mapPermissionState = async (): Promise<LocationPermissionState> => {
  const state = await checkLocationPermission();

  if (
    state === 'granted' ||
    state === 'denied' ||
    state === 'prompt' ||
    state === 'unsupported' ||
    state === 'unavailable'
  ) {
    return state;
  }

  return state === 'prompt-with-rationale' ? 'prompt' : 'unavailable';
};

const getNativeCurrentLocation = async () => {
  const result = await requestLocationPermission();
  if (result.location) {
    return result.location;
  }

  throw new LocationAdapterError(
    result.message || 'Location access is required to deliver your order.',
    result.state === 'unsupported' ? 'unsupported' : 'permission_denied',
  );
};

const watchNativeLocation: LocationAdapter['watchLocation'] = async ({
  onError,
  onLocation,
  options,
}) => {
  const permissionState = await mapPermissionState();
  if (permissionState !== 'granted') {
    const permissionResult = await requestLocationPermission();
    if (!permissionResult.location && permissionResult.state !== 'granted') {
      onError(new LocationAdapterError(
        permissionResult.message || 'Location access is required to deliver your order.',
        permissionResult.state === 'unsupported' ? 'unsupported' : 'permission_denied',
      ));
      return null;
    }
  }

  return Geolocation.watchPosition(
    {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      maximumAge: options?.maximumAgeMs ?? 0,
      timeout: options?.timeoutMs ?? 15000,
    },
    (position, error) => {
      if (error) {
        onError(new LocationAdapterError(
          error.message || 'Unable to access your location.',
          error.message?.toLowerCase().includes('denied')
            ? 'permission_denied'
            : 'unknown',
        ));
        return;
      }

      if (!position) {
        onError(new LocationAdapterError(
          'Location data is unavailable.',
          'position_unavailable',
        ));
        return;
      }

      onLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Number.isFinite(position.coords.accuracy)
          ? Number(position.coords.accuracy.toFixed(1))
          : undefined,
      });
    },
  );
};

export const locationAdapter: LocationAdapter = {
  clearWatch: watchId => {
    if (isNativeRuntime() && typeof watchId === 'string') {
      void Geolocation.clearWatch({ id: watchId });
      return;
    }

    if (typeof watchId === 'number') {
      clearBrowserLocationSubscription(watchId);
    }
  },
  getCurrentLocation: options => (
    isNativeRuntime()
      ? getNativeCurrentLocation()
      : getCurrentBrowserLocation(options)
  ),
  isSupported: () => isNativeRuntime() || isBrowserGeolocationSupported(),
  queryPermission: () => (
    isNativeRuntime()
      ? mapPermissionState()
      : queryBrowserGeolocationPermission()
  ),
  watchLocation: params => (
    isNativeRuntime()
      ? watchNativeLocation(params)
      : subscribeToBrowserLocation(params)
  ),
};
