import type { DeliveryLocation } from '../../types';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type PermissionStatus, type PositionOptions } from '@capacitor/geolocation';
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

const DEFAULT_LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAgeMs: 0,
  timeoutMs: 18000,
} satisfies Required<
  Pick<LocationRequestOptions, 'enableHighAccuracy' | 'maximumAgeMs' | 'timeoutMs'>
>;

const buildPositionOptions = (
  options: LocationRequestOptions = {},
): PositionOptions => ({
  enableHighAccuracy: options.enableHighAccuracy ?? DEFAULT_LOCATION_OPTIONS.enableHighAccuracy,
  maximumAge: options.maximumAgeMs ?? DEFAULT_LOCATION_OPTIONS.maximumAgeMs,
  timeout: options.timeoutMs ?? DEFAULT_LOCATION_OPTIONS.timeoutMs,
});

const mapBrowserPosition = (
  position: Awaited<ReturnType<typeof Geolocation.getCurrentPosition>>,
): DeliveryLocation => ({
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

const isNativeRuntime = () => Capacitor.isNativePlatform();

const getErrorDetails = (error: unknown) => {
  if (error && typeof error === 'object') {
    const data = error as {
      code?: unknown;
      localizedMessage?: unknown;
      message?: unknown;
    };

    return {
      code: typeof data.code === 'string'
        ? data.code
        : typeof data.code === 'number'
          ? String(data.code)
          : '',
      message:
        typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : typeof data.localizedMessage === 'string' && data.localizedMessage.trim()
            ? data.localizedMessage.trim()
            : '',
    };
  }

  if (error instanceof Error) {
    return { code: '', message: error.message.trim() };
  }

  return { code: '', message: '' };
};

const mapLocationError = (error: unknown) => {
  const { code, message } = getErrorDetails(error);
  const lowerMessage = message.toLowerCase();

  if (
    code === '1' ||
    code === 'OS-PLUG-GLOC-0003' ||
    lowerMessage.includes('location permission') ||
    lowerMessage.includes('permission request was denied') ||
    lowerMessage.includes('permission was denied') ||
    lowerMessage.includes('user denied geolocation')
  ) {
    return createLocationError('Location access denied.', 'permission_denied');
  }

  if (
    code === 'OS-PLUG-GLOC-0007' ||
    code === 'OS-PLUG-GLOC-0009' ||
    code === 'OS-PLUG-GLOC-0016' ||
    code === 'OS-PLUG-GLOC-0017' ||
    lowerMessage.includes('location services are not enabled') ||
    lowerMessage.includes('request to enable location was denied') ||
    lowerMessage.includes('both network and location turned off')
  ) {
    return createLocationError('Turn on GPS to continue.', 'services_disabled');
  }

  if (
    code === '3' ||
    code === 'OS-PLUG-GLOC-0010' ||
    lowerMessage.includes('timed out')
  ) {
    return createLocationError('Unable to fetch location. Try again.', 'timeout');
  }

  if (
    code === 'OS-PLUG-GLOC-0002' ||
    code === '2' ||
    lowerMessage.includes('position unavailable') ||
    lowerMessage.includes('unable to retrieve')
  ) {
    return createLocationError('Unable to fetch location. Try again.', 'position_unavailable');
  }

  if (
    lowerMessage.includes('not implemented on web') ||
    lowerMessage.includes('not supported') ||
    lowerMessage.includes('permissions api not available')
  ) {
    return createLocationError('Location is not supported on this device.', 'unsupported');
  }

  return createLocationError(message || 'Unable to fetch location. Try again.', 'unknown');
};

export const isBrowserGeolocationSupported = () =>
  isNativeRuntime() || (typeof navigator !== 'undefined' && 'geolocation' in navigator);

export const queryBrowserGeolocationPermission = async (): Promise<LocationPermissionState> => {
  if (!isBrowserGeolocationSupported()) {
    return 'unsupported';
  }

  try {
    const permission: PermissionStatus = await Geolocation.checkPermissions();

    if (permission.location === 'granted' || permission.coarseLocation === 'granted') {
      return 'granted';
    }

    if (permission.location === 'denied' && permission.coarseLocation === 'denied') {
      return 'denied';
    }

    if (permission.location === 'prompt' || permission.coarseLocation === 'prompt') {
      return 'prompt';
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

  void Geolocation.getCurrentPosition(buildPositionOptions(options))
    .then(position => {
      resolve(mapBrowserPosition(position));
    })
    .catch(error => {
      reject(mapLocationError(error));
    });
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

  if (isNativeRuntime()) {
    return Geolocation.watchPosition(
      buildPositionOptions(options),
      (position, error) => {
        if (error) {
          onError(mapLocationError(error));
          return;
        }

        if (!position) {
          onError(createLocationError('Unable to fetch location. Try again.', 'position_unavailable'));
          return;
        }

        onLocation(mapBrowserPosition(position));
      },
    );
  }

  return Geolocation.watchPosition(
    buildPositionOptions(options),
    (position, error) => {
      if (error) {
        onError(mapLocationError(error));
        return;
      }

      if (!position) {
        onError(createLocationError('Unable to fetch location. Try again.', 'position_unavailable'));
        return;
      }

      onLocation(mapBrowserPosition(position));
    },
  );
};

export const clearBrowserLocationSubscription = (watchId: number) => {
  if (!isBrowserGeolocationSupported()) {
    return;
  }

  void Geolocation.clearWatch({ id: String(watchId) });
};
