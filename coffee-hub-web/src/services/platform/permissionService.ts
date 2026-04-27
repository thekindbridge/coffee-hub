import { Capacitor } from '@capacitor/core';
import { Geolocation, type PermissionStatus } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import type { DeliveryLocation } from '../../types';
import type { LocationSettingsTarget } from './locationAdapter';
import {
  openNativeAppSettings,
  openNativeLocationSettings,
} from '../native/locationSettingsService';

export type AppPermissionState =
  | 'default'
  | 'denied'
  | 'granted'
  | 'prompt'
  | 'prompt-with-rationale'
  | 'unsupported'
  | 'unavailable';

export type LocationPermissionResult = {
  location: DeliveryLocation | null;
  message?: string;
  requiresSettings: boolean;
  settingsTarget: LocationSettingsTarget | null;
  state: AppPermissionState;
};

const LOCATION_PERMISSION_MESSAGE =
  'Location access denied.';
const LOCATION_SETTINGS_MESSAGE =
  'Please enable location in app settings.';
const LOCATION_SERVICES_MESSAGE =
  'Turn on GPS to continue.';
const NOTIFICATION_UNSUPPORTED_MESSAGE =
  'Notifications are not supported on this device.';

const isCapacitorNative = () => Capacitor.isNativePlatform();
const isCapacitorAndroid = () =>
  isCapacitorNative() && Capacitor.getPlatform() === 'android';

const normalizePermissionState = (value: string | undefined): AppPermissionState => {
  if (
    value === 'granted' ||
    value === 'denied' ||
    value === 'prompt' ||
    value === 'prompt-with-rationale'
  ) {
    return value;
  }

  if (value === 'default') {
    return 'default';
  }

  return 'unavailable';
};

const mapNativePosition = (
  position: Awaited<ReturnType<typeof Geolocation.getCurrentPosition>>,
): DeliveryLocation => ({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  accuracy: Number.isFinite(position.coords.accuracy)
    ? Number(position.coords.accuracy.toFixed(1))
    : undefined,
});

const getBrowserNotificationState = (): AppPermissionState => {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
};

const getLocationErrorDetails = (error: unknown) => {
  if (error && typeof error === 'object') {
    const data = error as {
      code?: unknown;
      localizedMessage?: unknown;
      message?: unknown;
    };

    return {
      code: typeof data.code === 'string' ? data.code : '',
      message:
        typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : typeof data.localizedMessage === 'string' && data.localizedMessage.trim()
            ? data.localizedMessage.trim()
            : '',
    };
  }

  if (error instanceof Error) {
    return {
      code: '',
      message: error.message.trim(),
    };
  }

  return {
    code: '',
    message: '',
  };
};

const mapLocationPermissionFailure = (
  error: unknown,
): Omit<LocationPermissionResult, 'location'> => {
  const { code, message } = getLocationErrorDetails(error);
  const normalizedMessage = message.toLowerCase();

  if (
    code === 'OS-PLUG-GLOC-0007' ||
    code === 'OS-PLUG-GLOC-0009' ||
    code === 'OS-PLUG-GLOC-0016' ||
    code === 'OS-PLUG-GLOC-0017' ||
    normalizedMessage.includes('location services are not enabled') ||
    normalizedMessage.includes('request to enable location was denied') ||
    normalizedMessage.includes('both network and location turned off')
  ) {
    return {
      message: LOCATION_SERVICES_MESSAGE,
      requiresSettings: true,
      settingsTarget: 'location',
      state: 'unavailable',
    };
  }

  if (
    code === 'OS-PLUG-GLOC-0003' ||
    normalizedMessage.includes('location permission') ||
    normalizedMessage.includes('permission request was denied') ||
    normalizedMessage.includes('permission was denied') ||
    normalizedMessage.includes('user denied geolocation')
  ) {
    return {
      message: 'Location is required to place an order.',
      requiresSettings: true,
      settingsTarget: 'app',
      state: 'denied',
    };
  }

  if (
    normalizedMessage.includes('not supported') ||
    normalizedMessage.includes('not implemented on web')
  ) {
    return {
      message: 'Location is not supported on this device.',
      requiresSettings: false,
      settingsTarget: null,
      state: 'unsupported',
    };
  }

  return {
    message: LOCATION_PERMISSION_MESSAGE,
    requiresSettings: false,
    settingsTarget: null,
    state: 'unavailable',
  };
};

export const checkNotificationPermission = async (): Promise<AppPermissionState> => {
  if (!isCapacitorAndroid()) {
    return getBrowserNotificationState();
  }

  const [pushPermission, localPermission] = await Promise.all([
    PushNotifications.checkPermissions(),
    LocalNotifications.checkPermissions(),
  ]);
  const pushState = normalizePermissionState(pushPermission.receive);
  const localState = normalizePermissionState(localPermission.display);

  if (pushState === 'denied' || localState === 'denied') {
    return 'denied';
  }

  if (pushState === 'granted' && localState === 'granted') {
    return 'granted';
  }

  return 'default';
};

export const requestNotificationPermission = async (): Promise<AppPermissionState> => {
  if (!isCapacitorAndroid()) {
    if (typeof Notification === 'undefined') {
      return 'unsupported';
    }

    return Notification.requestPermission();
  }

  let pushPermission = await PushNotifications.checkPermissions();
  if (pushPermission.receive !== 'granted' && pushPermission.receive !== 'denied') {
    pushPermission = await PushNotifications.requestPermissions();
  }

  let localPermission = await LocalNotifications.checkPermissions();
  if (localPermission.display !== 'granted' && localPermission.display !== 'denied') {
    localPermission = await LocalNotifications.requestPermissions();
  }

  if (pushPermission.receive !== 'granted' || localPermission.display !== 'granted') {
    return 'denied';
  }

  await PushNotifications.register();
  return 'granted';
};

const normalizeLocationPermission = (permission: PermissionStatus): AppPermissionState => {
  const locationState = normalizePermissionState(permission.location);
  const coarseState = normalizePermissionState(permission.coarseLocation);

  if (locationState === 'granted' || coarseState === 'granted') {
    return 'granted';
  }

  if (locationState === 'denied' && coarseState === 'denied') {
    return 'denied';
  }

  if (locationState === 'prompt-with-rationale' || coarseState === 'prompt-with-rationale') {
    return 'prompt-with-rationale';
  }

  if (locationState === 'prompt' || coarseState === 'prompt') {
    return 'prompt';
  }

  return 'unavailable';
};

export const checkLocationPermission = async (): Promise<AppPermissionState> => {
  if (typeof navigator === 'undefined' && !isCapacitorNative()) {
    return 'unsupported';
  }

  try {
    return normalizeLocationPermission(await Geolocation.checkPermissions());
  } catch (error) {
    if (mapLocationPermissionFailure(error).state === 'unsupported') {
      return 'unsupported';
    }

    return 'unavailable';
  }
};

export const requestLocationPermission = async (): Promise<LocationPermissionResult> => {
  if (isCapacitorNative()) {
    const beforeRequestState = await checkLocationPermission();
    let nextState = beforeRequestState;

    if (beforeRequestState !== 'granted') {
      try {
        nextState = normalizeLocationPermission(await Geolocation.requestPermissions());
      } catch (error) {
        return {
          location: null,
          ...mapLocationPermissionFailure(error),
        };
      }
    }

    if (nextState !== 'granted') {
      return {
        location: null,
        message: nextState === 'denied'
          ? 'Location is required to place an order.'
          : LOCATION_PERMISSION_MESSAGE,
        requiresSettings: nextState === 'denied',
        settingsTarget: nextState === 'denied' ? 'app' : null,
        state: nextState,
      };
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        enableLocationFallback: true,
        maximumAge: 0,
        timeout: 18000,
      });

      return {
        location: mapNativePosition(position),
        requiresSettings: false,
        settingsTarget: null,
        state: 'granted',
      };
    } catch (error) {
      return {
        location: null,
        ...mapLocationPermissionFailure(error),
      };
    }
  }

  const permissionState = await checkLocationPermission();
  if (permissionState === 'unsupported') {
    return {
      location: null,
      message: 'Location is not supported on this device.',
      requiresSettings: false,
      settingsTarget: null,
      state: 'unsupported',
    };
  }

  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 18000,
    });

    return {
      location: mapNativePosition(position),
      requiresSettings: false,
      settingsTarget: null,
      state: 'granted',
    };
  } catch (error) {
    const failure = mapLocationPermissionFailure(error);
    const nextState = await checkLocationPermission();
    const isDenied = nextState === 'denied';

    return {
      location: null,
      message: isDenied ? 'Location is required to place an order.' : failure.message,
      requiresSettings: isDenied || failure.requiresSettings,
      settingsTarget: isDenied ? 'app' : failure.settingsTarget,
      state: nextState === 'unavailable' ? permissionState : nextState,
    };
  }
};

export const openPermissionSettings = async (
  target: LocationSettingsTarget = 'app',
) => {
  if (!isCapacitorNative()) {
    return false;
  }

  try {
    if (target === 'location') {
      await openNativeLocationSettings();
      return true;
    }

    await openNativeAppSettings();
    return true;
  } catch (error) {
    console.error('Unable to open permission settings', error);
    return false;
  }
};

export const getFriendlyLocationPermissionMessage = (state: AppPermissionState) => {
  if (state === 'denied') {
    return 'Location is required to place an order.';
  }

  if (state === 'unsupported') {
    return 'Location is not supported on this device.';
  }

  if (state === 'unavailable') {
    return LOCATION_SERVICES_MESSAGE;
  }

  return LOCATION_PERMISSION_MESSAGE;
};

export const getFriendlyNotificationPermissionMessage = (state: AppPermissionState) => {
  if (state === 'unsupported') {
    return NOTIFICATION_UNSUPPORTED_MESSAGE;
  }

  if (state === 'denied') {
    return 'Please enable notification permission from Settings.';
  }

  return 'Notifications help you receive order updates on time.';
};
