import type { DeliveryLocation } from '../../types';
import type {
  LocationAdapterErrorCode,
  LocationPermissionState,
  LocationRequestOptions,
} from '../platform/locationAdapter';

class BrowserLocationError extends Error {
  readonly code: LocationAdapterErrorCode;

  constructor(message: string, code: LocationAdapterErrorCode) {
    super(message);
    this.name = 'BrowserLocationError';
    this.code = code;
  }
}

const DEFAULT_LOCATION_OPTIONS: Required<LocationRequestOptions> = {
  enableHighAccuracy: true,
  maximumAgeMs: 0,
  timeoutMs: 15000,
};

const buildPositionOptions = (
  options: LocationRequestOptions = {},
): PositionOptions => ({
  enableHighAccuracy: options.enableHighAccuracy ?? DEFAULT_LOCATION_OPTIONS.enableHighAccuracy,
  maximumAge: options.maximumAgeMs ?? DEFAULT_LOCATION_OPTIONS.maximumAgeMs,
  timeout: options.timeoutMs ?? DEFAULT_LOCATION_OPTIONS.timeoutMs,
});

const mapBrowserPosition = (position: GeolocationPosition): DeliveryLocation => ({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  accuracy: Number.isFinite(position.coords.accuracy)
    ? Number(position.coords.accuracy.toFixed(1))
    : undefined,
});

const createLocationError = (
  message: string,
  code: LocationAdapterErrorCode,
) => new BrowserLocationError(message, code);

const mapLocationError = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) {
    return createLocationError(
      error.message || 'Location permission was denied.',
      'permission_denied',
    );
  }

  if (error.code === error.TIMEOUT) {
    return createLocationError(
      error.message || 'Location request timed out.',
      'timeout',
    );
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return createLocationError(
      error.message || 'Location data is unavailable.',
      'position_unavailable',
    );
  }

  return createLocationError(
    error.message || 'Unable to access your location.',
    'unknown',
  );
};

export const isBrowserGeolocationSupported = () =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator;

export const queryBrowserGeolocationPermission = async (): Promise<LocationPermissionState> => {
  if (!isBrowserGeolocationSupported()) {
    return 'unsupported';
  }

  if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
    return 'unavailable';
  }

  try {
    const permissionResult = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    });

    if (
      permissionResult.state === 'granted' ||
      permissionResult.state === 'denied' ||
      permissionResult.state === 'prompt'
    ) {
      return permissionResult.state;
    }

    return 'unavailable';
  } catch {
    return 'unavailable';
  }
};

export const getCurrentBrowserLocation = (
  options?: LocationRequestOptions,
) => new Promise<DeliveryLocation>((resolve, reject) => {
  if (!isBrowserGeolocationSupported()) {
    reject(
      createLocationError(
        'Geolocation is not supported on this device.',
        'unsupported',
      ),
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      resolve(mapBrowserPosition(position));
    },
    error => {
      reject(mapLocationError(error));
    },
    buildPositionOptions(options),
  );
});

export const subscribeToBrowserLocation = ({
  onError,
  onLocation,
  options,
}: {
  onError: (error: BrowserLocationError) => void;
  onLocation: (location: DeliveryLocation) => void;
  options?: LocationRequestOptions;
}) => {
  if (!isBrowserGeolocationSupported()) {
    onError(
      createLocationError(
        'Geolocation is not supported on this device.',
        'unsupported',
      ),
    );
    return null;
  }

  return navigator.geolocation.watchPosition(
    position => {
      onLocation(mapBrowserPosition(position));
    },
    error => {
      onError(mapLocationError(error));
    },
    buildPositionOptions(options),
  );
};

export const clearBrowserLocationSubscription = (watchId: number) => {
  if (!isBrowserGeolocationSupported()) {
    return;
  }

  navigator.geolocation.clearWatch(watchId);
};
