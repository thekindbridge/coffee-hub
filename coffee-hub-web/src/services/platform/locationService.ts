import type { DeliveryLocation } from '../../types';
import { openPermissionSettings } from './permissionService';
import {
  locationAdapter,
  LocationAdapterError,
  type LocationRequestOptions,
  type LocationSettingsTarget,
} from './locationAdapter';

export type LocationCaptureResult = {
  canOpenLocationSettings: boolean;
  isRetryable: boolean;
  location: DeliveryLocation | null;
  locationSettingsTarget: LocationSettingsTarget | null;
  message: string;
};

const mapLocationCaptureError = (error: unknown): LocationCaptureResult => {
  if (error instanceof LocationAdapterError) {
    const locationSettingsTarget =
      error.recoveryAction === 'open-app-settings'
        ? 'app'
        : error.recoveryAction === 'open-location-settings'
          ? 'location'
          : null;

    return {
      canOpenLocationSettings: locationSettingsTarget !== null,
      isRetryable: error.recoveryAction === 'retry',
      location: null,
      locationSettingsTarget,
      message: error.message,
    };
  }

  const message = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : 'Unable to fetch location. Try again.';

  return {
    canOpenLocationSettings: false,
    isRetryable: true,
    location: null,
    locationSettingsTarget: null,
    message,
  };
};

export const captureCurrentLocation = async (
  options?: LocationRequestOptions,
): Promise<LocationCaptureResult> => {
  try {
    const location = await locationAdapter.getCurrentLocation({
      ...options,
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      enableLocationFallback: options?.enableLocationFallback ?? true,
      maxAttempts: options?.maxAttempts ?? 2,
      maximumAgeMs: options?.maximumAgeMs ?? 0,
      timeoutMs: options?.timeoutMs ?? 18000,
    });

    return {
      canOpenLocationSettings: false,
      isRetryable: false,
      location,
      locationSettingsTarget: null,
      message: '',
    };
  } catch (error) {
    return mapLocationCaptureError(error);
  }
};

export const openLocationSettings = async (
  target: LocationSettingsTarget = 'app',
) => openPermissionSettings(target);
