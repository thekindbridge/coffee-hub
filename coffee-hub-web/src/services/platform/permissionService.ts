import { Capacitor } from '@capacitor/core';
import { Geolocation, type PermissionStatus } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import type { DeliveryLocation } from '../../types';

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
  state: AppPermissionState;
};

const LOCATION_PERMISSION_MESSAGE =
  'Location access is required to deliver your order.';
const LOCATION_SETTINGS_MESSAGE =
  'Please enable location permission from Settings.';
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
  if (isCapacitorNative()) {
    return normalizeLocationPermission(await Geolocation.checkPermissions());
  }

  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return 'unsupported';
  }

  if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
    return 'unavailable';
  }

  try {
    const permissionResult = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    });

    return normalizePermissionState(permissionResult.state);
  } catch {
    return 'unavailable';
  }
};

const getBrowserCurrentPosition = () =>
  new Promise<DeliveryLocation>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Location is not supported on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? Number(position.coords.accuracy.toFixed(1))
            : undefined,
        });
      },
      error => reject(error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );
  });

export const requestLocationPermission = async (): Promise<LocationPermissionResult> => {
  if (isCapacitorNative()) {
    const beforeRequestState = await checkLocationPermission();
    let nextState = beforeRequestState;

    if (beforeRequestState !== 'granted') {
      nextState = normalizeLocationPermission(await Geolocation.requestPermissions());
    }

    if (nextState !== 'granted') {
      return {
        location: null,
        message: nextState === 'denied' ? LOCATION_SETTINGS_MESSAGE : LOCATION_PERMISSION_MESSAGE,
        requiresSettings: nextState === 'denied',
        state: nextState,
      };
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    });

    return {
      location: mapNativePosition(position),
      requiresSettings: false,
      state: 'granted',
    };
  }

  const permissionState = await checkLocationPermission();
  if (permissionState === 'unsupported') {
    return {
      location: null,
      message: 'Location is not supported on this device.',
      requiresSettings: false,
      state: 'unsupported',
    };
  }

  try {
    return {
      location: await getBrowserCurrentPosition(),
      requiresSettings: false,
      state: 'granted',
    };
  } catch {
    const nextState = await checkLocationPermission();
    const isDenied = nextState === 'denied';

    return {
      location: null,
      message: isDenied ? LOCATION_SETTINGS_MESSAGE : LOCATION_PERMISSION_MESSAGE,
      requiresSettings: isDenied,
      state: nextState === 'unavailable' ? permissionState : nextState,
    };
  }
};

export const openPermissionSettings = async () => {
  if (!isCapacitorNative()) {
    return false;
  }

  const capacitorWithPlugins = Capacitor as unknown as {
    Plugins?: Record<string, { openSettings?: () => Promise<void> }>;
  };
  const appPlugin = capacitorWithPlugins.Plugins?.App;
  if (typeof appPlugin?.openSettings !== 'function') {
    return false;
  }

  await appPlugin.openSettings();
  return true;
};

export const getFriendlyLocationPermissionMessage = (state: AppPermissionState) => {
  if (state === 'denied') {
    return LOCATION_SETTINGS_MESSAGE;
  }

  if (state === 'unsupported') {
    return 'Location is not supported on this device.';
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
