import type { DeliveryLocation } from '../../types';
import { Capacitor } from '@capacitor/core';
import {
  Geolocation,
  type PermissionStatus,
  type PositionOptions,
} from '@capacitor/geolocation';

export type LocationPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported'
  | 'unavailable';

export type LocationSettingsTarget = 'app' | 'location';

export type LocationRequestOptions = {
  enableHighAccuracy?: boolean;
  enableLocationFallback?: boolean;
  intervalMs?: number;
  maxAttempts?: number;
  maximumAgeMs?: number;
  minimumUpdateIntervalMs?: number;
  timeoutMs?: number;
};

export type LocationRecoveryAction =
  | 'none'
  | 'open-app-settings'
  | 'open-location-settings'
  | 'retry';

export type LocationAdapterErrorCode =
  | 'permission_denied'
  | 'position_unavailable'
  | 'services_disabled'
  | 'timeout'
  | 'unsupported'
  | 'unknown';

export class LocationAdapterError extends Error {
  readonly code: LocationAdapterErrorCode;
  readonly causeCode: string;
  readonly recoveryAction: LocationRecoveryAction;

  constructor(
    message: string,
    code: LocationAdapterErrorCode,
    recoveryAction: LocationRecoveryAction = 'retry',
    causeCode = '',
  ) {
    super(message);
    this.name = 'LocationAdapterError';
    this.code = code;
    this.causeCode = causeCode;
    this.recoveryAction = recoveryAction;
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

const DEFAULT_CURRENT_LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  enableLocationFallback: true,
  maximumAgeMs: 0,
  timeoutMs: 18000,
} satisfies Required<
  Pick<
    LocationRequestOptions,
    'enableHighAccuracy' | 'enableLocationFallback' | 'maximumAgeMs' | 'timeoutMs'
  >
>;

const DEFAULT_WATCH_LOCATION_OPTIONS = {
  ...DEFAULT_CURRENT_LOCATION_OPTIONS,
  intervalMs: 12000,
  minimumUpdateIntervalMs: 5000,
} satisfies Required<
  Pick<
    LocationRequestOptions,
    | 'enableHighAccuracy'
    | 'enableLocationFallback'
    | 'intervalMs'
    | 'maximumAgeMs'
    | 'minimumUpdateIntervalMs'
    | 'timeoutMs'
  >
>;

const isNativeRuntime = () => Capacitor.isNativePlatform();

const isLocationApiSupported = () => (
  isNativeRuntime() ||
  (typeof navigator !== 'undefined' && 'geolocation' in navigator)
);

const normalizePermissionState = (
  value: string | undefined,
): LocationPermissionState => {
  if (value === 'granted' || value === 'denied' || value === 'prompt') {
    return value;
  }

  if (value === 'prompt-with-rationale') {
    return 'prompt';
  }

  return 'unavailable';
};

const normalizeLocationPermission = (
  permission: PermissionStatus,
): LocationPermissionState => {
  const locationState = normalizePermissionState(permission.location);
  const coarseState = normalizePermissionState(permission.coarseLocation);

  if (locationState === 'granted' || coarseState === 'granted') {
    return 'granted';
  }

  if (locationState === 'denied' && coarseState === 'denied') {
    return 'denied';
  }

  if (locationState === 'prompt' || coarseState === 'prompt') {
    return 'prompt';
  }

  return 'unavailable';
};

const buildLocation = (
  position: Awaited<ReturnType<typeof Geolocation.getCurrentPosition>>,
): DeliveryLocation => ({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  accuracy: Number.isFinite(position.coords.accuracy)
    ? Number(position.coords.accuracy.toFixed(1))
    : undefined,
});

const getErrorDetails = (error: unknown) => {
  if (error && typeof error === 'object') {
    const data = error as {
      code?: unknown;
      localizedMessage?: unknown;
      message?: unknown;
    };
    const code = typeof data.code === 'string'
      ? data.code
      : typeof data.code === 'number'
        ? String(data.code)
        : '';
    const message =
      typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : typeof data.localizedMessage === 'string' && data.localizedMessage.trim()
          ? data.localizedMessage.trim()
          : '';

    return { code, message };
  }

  if (error instanceof Error) {
    return { code: '', message: error.message.trim() };
  }

  return { code: '', message: '' };
};

const createLocationError = (
  message: string,
  code: LocationAdapterErrorCode,
  recoveryAction: LocationRecoveryAction,
  causeCode = '',
) => new LocationAdapterError(message, code, recoveryAction, causeCode);

const mapLocationError = (error: unknown): LocationAdapterError => {
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
    return createLocationError(
      'Permission required to get your location.',
      'permission_denied',
      isNativeRuntime() ? 'open-app-settings' : 'retry',
      code,
    );
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
    return createLocationError(
      'Turn on GPS for better accuracy, then try again.',
      'services_disabled',
      'open-location-settings',
      code,
    );
  }

  if (
    code === '3' ||
    code === 'OS-PLUG-GLOC-0010' ||
    lowerMessage.includes('timed out')
  ) {
    return createLocationError(
      'Fetching your location took too long. Please retry.',
      'timeout',
      'retry',
      code,
    );
  }

  if (
    code === 'OS-PLUG-GLOC-0002' ||
    code === '2' ||
    lowerMessage.includes('position unavailable') ||
    lowerMessage.includes('unable to retrieve')
  ) {
    return createLocationError(
      'We could not lock your location yet. Please retry in a spot with better GPS signal.',
      'position_unavailable',
      'retry',
      code,
    );
  }

  if (
    lowerMessage.includes('not implemented on web') ||
    lowerMessage.includes('not supported') ||
    lowerMessage.includes('permissions api not available')
  ) {
    return createLocationError(
      'Location is not supported on this device.',
      'unsupported',
      'none',
      code,
    );
  }

  return createLocationError(
    message || 'Unable to access your location right now.',
    'unknown',
    'retry',
    code,
  );
};

const buildPositionOptions = (
  options: LocationRequestOptions = {},
  mode: 'current' | 'watch',
): PositionOptions => {
  const defaults =
    mode === 'watch'
      ? DEFAULT_WATCH_LOCATION_OPTIONS
      : DEFAULT_CURRENT_LOCATION_OPTIONS;

  const positionOptions: PositionOptions = {
    enableHighAccuracy:
      options.enableHighAccuracy ?? defaults.enableHighAccuracy,
    maximumAge: options.maximumAgeMs ?? defaults.maximumAgeMs,
    timeout: options.timeoutMs ?? defaults.timeoutMs,
  };

  if (isNativeRuntime()) {
    positionOptions.enableLocationFallback =
      options.enableLocationFallback ?? defaults.enableLocationFallback;

    if (mode === 'watch') {
      positionOptions.interval =
        options.intervalMs ?? DEFAULT_WATCH_LOCATION_OPTIONS.intervalMs;
      positionOptions.minimumUpdateInterval =
        options.minimumUpdateIntervalMs ??
        DEFAULT_WATCH_LOCATION_OPTIONS.minimumUpdateIntervalMs;
    }
  }

  return positionOptions;
};

const getSupportedRetryAttempts = (
  maxAttempts: number | undefined,
) => {
  const attempts = Number(maxAttempts);
  if (!Number.isFinite(attempts) || attempts < 1) {
    return 2;
  }

  return Math.min(Math.floor(attempts), 2);
};

const queryPluginPermission = async (): Promise<LocationPermissionState> => {
  if (!isLocationApiSupported()) {
    return 'unsupported';
  }

  try {
    return normalizeLocationPermission(await Geolocation.checkPermissions());
  } catch (error) {
    const mappedError = mapLocationError(error);
    return mappedError.code === 'unsupported' ? 'unsupported' : 'unavailable';
  }
};

const ensureNativePermission = async () => {
  if (!isNativeRuntime()) {
    return;
  }

  const currentState = await queryPluginPermission();
  if (currentState === 'granted') {
    return;
  }

  try {
    const requestedState = normalizeLocationPermission(
      await Geolocation.requestPermissions(),
    );

    if (requestedState === 'granted') {
      return;
    }

    throw createLocationError(
      'Permission required to get your location.',
      'permission_denied',
      'open-app-settings',
    );
  } catch (error) {
    throw error instanceof LocationAdapterError
      ? error
      : mapLocationError(error);
  }
};

const getPluginCurrentLocation = async (
  options?: LocationRequestOptions,
) => {
  const position = await Geolocation.getCurrentPosition(
    buildPositionOptions(options, 'current'),
  );

  return buildLocation(position);
};

const getLocationWithRetry = async (
  options?: LocationRequestOptions,
): Promise<DeliveryLocation> => {
  if (!isLocationApiSupported()) {
    throw createLocationError(
      'Location is not supported on this device.',
      'unsupported',
      'none',
    );
  }

  await ensureNativePermission();

  const maxAttempts = getSupportedRetryAttempts(options?.maxAttempts);
  let lastError: LocationAdapterError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await getPluginCurrentLocation(options);
    } catch (error) {
      lastError = error instanceof LocationAdapterError
        ? error
        : mapLocationError(error);

      const canRetry =
        lastError.code === 'timeout' ||
        lastError.code === 'position_unavailable';

      if (!canRetry || attempt >= maxAttempts) {
        throw lastError;
      }
    }
  }

  throw lastError ?? createLocationError(
    'Unable to access your location right now.',
    'unknown',
    'retry',
  );
};

const watchPluginLocation: LocationAdapter['watchLocation'] = async ({
  onError,
  onLocation,
  options,
}) => {
  if (!isLocationApiSupported()) {
    onError(createLocationError(
      'Location is not supported on this device.',
      'unsupported',
      'none',
    ));
    return null;
  }

  try {
    await ensureNativePermission();
  } catch (error) {
    onError(
      error instanceof LocationAdapterError
        ? error
        : mapLocationError(error),
    );
    return null;
  }

  return Geolocation.watchPosition(
    buildPositionOptions(options, 'watch'),
    (position, error) => {
      if (error) {
        onError(mapLocationError(error));
        return;
      }

      if (!position) {
        onError(createLocationError(
          'Location data is unavailable.',
          'position_unavailable',
          'retry',
        ));
        return;
      }

      onLocation(buildLocation(position));
    },
  );
};

export const locationAdapter: LocationAdapter = {
  clearWatch: watchId => {
    void Geolocation.clearWatch({ id: String(watchId) });
  },
  getCurrentLocation: options => getLocationWithRetry(options),
  isSupported: () => isLocationApiSupported(),
  queryPermission: () => queryPluginPermission(),
  watchLocation: params => watchPluginLocation(params),
};
