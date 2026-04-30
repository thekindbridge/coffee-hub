import type { DeliveryLocation } from '../../types';
import { openPermissionSettings } from './permissionService';
import {
  locationAdapter,
  LocationAdapterError,
  type LocationAdapterErrorCode,
  type LocationRequestOptions,
  type LocationSettingsTarget,
} from './locationAdapter';

export const LOCATION_REQUIRED_MESSAGE =
  'Location is required for delivery. Please allow access.';
export const LOCATION_FAILED_MESSAGE =
  'Unable to get your location. Please turn on GPS and try again.';

export type LocationCaptureResult = {
  canOpenLocationSettings: boolean;
  errorCode: LocationAdapterErrorCode | 'unknown' | null;
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
      errorCode: error.code,
      isRetryable: error.recoveryAction === 'retry',
      location: null,
      locationSettingsTarget,
      message:
        error.code === 'permission_denied'
          ? LOCATION_REQUIRED_MESSAGE
          : error.code === 'services_disabled' ||
              error.code === 'timeout' ||
              error.code === 'position_unavailable'
            ? LOCATION_FAILED_MESSAGE
            : error.message,
    };
  }

  const message = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : 'Unable to fetch location. Try again.';

  return {
    canOpenLocationSettings: false,
    errorCode: 'unknown',
    isRetryable: true,
    location: null,
    locationSettingsTarget: null,
    message: message === 'Unable to fetch location. Try again.'
      ? LOCATION_FAILED_MESSAGE
      : message,
  };
};

export const captureCurrentLocation = async (
  options?: LocationRequestOptions,
): Promise<LocationCaptureResult> => {
  try {
    const permissionState = await locationAdapter.queryPermission();

    if (permissionState === 'denied') {
      return {
        canOpenLocationSettings: true,
        errorCode: 'permission_denied',
        isRetryable: false,
        location: null,
        locationSettingsTarget: 'app',
        message: LOCATION_REQUIRED_MESSAGE,
      };
    }

    if (permissionState === 'unsupported') {
      return {
        canOpenLocationSettings: false,
        errorCode: 'unsupported',
        isRetryable: false,
        location: null,
        locationSettingsTarget: null,
        message: 'Location is not supported on this device.',
      };
    }

    const location = await locationAdapter.getCurrentLocation({
      ...options,
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      enableLocationFallback: options?.enableLocationFallback ?? true,
      maxAttempts: options?.maxAttempts ?? 1,
      maximumAgeMs: options?.maximumAgeMs ?? 0,
      timeoutMs: options?.timeoutMs ?? 5000,
    });

    return {
      canOpenLocationSettings: false,
      errorCode: null,
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
