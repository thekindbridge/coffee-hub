import * as ExpoLocation from 'expo-location';
import type { DeliveryLocation } from '../../types';

const FALLBACK_LAT = Number(process.env.EXPO_PUBLIC_CHECKOUT_FALLBACK_LAT ?? '15.4803');
const FALLBACK_LNG = Number(process.env.EXPO_PUBLIC_CHECKOUT_FALLBACK_LNG ?? '80.0515');

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

type WatchEntry = {
  cancelled: boolean;
  subscription: ExpoLocation.LocationSubscription | null;
};

let nextWatchId = 1;
const watchEntries = new Map<number, WatchEntry>();

const toAdapterError = (error: unknown) => {
  if (error instanceof LocationAdapterError) {
    return error;
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('denied')) {
      return new LocationAdapterError(error.message, 'permission_denied');
    }
    if (lowerMessage.includes('timeout')) {
      return new LocationAdapterError(error.message, 'timeout');
    }

    return new LocationAdapterError(error.message, 'position_unavailable');
  }

  return new LocationAdapterError('Location services are unavailable right now.', 'unknown');
};

const toDeliveryLocation = (location: ExpoLocation.LocationObject): DeliveryLocation => ({
  lat: location.coords.latitude,
  lng: location.coords.longitude,
  accuracy: typeof location.coords.accuracy === 'number'
    ? location.coords.accuracy
    : undefined,
  updated_at: new Date(location.timestamp).toISOString(),
});

const toLocationOptions = (options?: LocationRequestOptions): ExpoLocation.LocationOptions => ({
  accuracy: options?.enableHighAccuracy
    ? ExpoLocation.Accuracy.BestForNavigation
    : ExpoLocation.Accuracy.Balanced,
  mayShowUserSettingsDialog: true,
  timeInterval: 5000,
});

const ensureForegroundPermission = async (): Promise<LocationPermissionState> => {
  try {
    const currentPermission = await ExpoLocation.getForegroundPermissionsAsync();
    if (currentPermission.granted) {
      return 'granted';
    }

    if (!currentPermission.canAskAgain) {
      return 'denied';
    }

    const requestedPermission = await ExpoLocation.requestForegroundPermissionsAsync();
    if (requestedPermission.granted) {
      return 'granted';
    }

    return requestedPermission.canAskAgain ? 'prompt' : 'denied';
  } catch (error) {
    console.error('Failed to resolve foreground location permission', error);
    return 'unavailable';
  }
};

export const locationAdapter: LocationAdapter = {
  clearWatch(watchId) {
    const entry = watchEntries.get(watchId);
    if (!entry) {
      return;
    }

    entry.cancelled = true;
    entry.subscription?.remove();
    watchEntries.delete(watchId);
  },
  async getCurrentLocation(options) {
    const permissionState = await ensureForegroundPermission();
    if (permissionState !== 'granted') {
      return getFallbackLocation();
    }

    try {
      const location = await ExpoLocation.getCurrentPositionAsync(
        toLocationOptions(options),
      );

      return toDeliveryLocation(location);
    } catch (error) {
      console.error('Failed to capture the current device location', error);
      return getFallbackLocation();
    }
  },
  isSupported() {
    return true;
  },
  async queryPermission() {
    return ensureForegroundPermission();
  },
  watchLocation({ onError, onLocation, options }) {
    const watchId = nextWatchId;
    nextWatchId += 1;
    watchEntries.set(watchId, {
      cancelled: false,
      subscription: null,
    });

    void (async () => {
      try {
        const permissionState = await ensureForegroundPermission();
        if (permissionState !== 'granted') {
          throw new LocationAdapterError(
            'Location permission is required to start live delivery tracking.',
            'permission_denied',
          );
        }

        const subscription = await ExpoLocation.watchPositionAsync(
          {
            ...toLocationOptions(options),
            distanceInterval: 10,
          },
          nextLocation => {
            onLocation(toDeliveryLocation(nextLocation));
          },
        );

        const currentEntry = watchEntries.get(watchId);
        if (!currentEntry || currentEntry.cancelled) {
          subscription.remove();
          watchEntries.delete(watchId);
          return;
        }

        currentEntry.subscription = subscription;
      } catch (error) {
        watchEntries.delete(watchId);
        onError(toAdapterError(error));
      }
    })();

    return watchId;
  },
};

export const getFallbackLocation = (): DeliveryLocation => ({
  lat: Number.isFinite(FALLBACK_LAT) ? FALLBACK_LAT : 15.4803,
  lng: Number.isFinite(FALLBACK_LNG) ? FALLBACK_LNG : 80.0515,
  updated_at: new Date().toISOString(),
});
