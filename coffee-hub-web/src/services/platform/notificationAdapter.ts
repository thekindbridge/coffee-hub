import { Capacitor } from '@capacitor/core';
import {
  getDesktopNotificationPermissionState,
  requestDesktopNotificationPermission,
  showDesktopNotification,
} from '../browser/desktopNotificationService';

export type NotificationPermissionState =
  | 'default'
  | 'denied'
  | 'granted'
  | 'unsupported';

export type NotificationPayload = {
  title: string;
  body?: string;
  icon?: string;
};

export interface NotificationAdapter {
  getPermissionState(): NotificationPermissionState;
  requestPermission(): Promise<NotificationPermissionState>;
  show(payload: NotificationPayload): void;
}

const isNativeAndroidRuntime = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const notificationAdapter: NotificationAdapter = {
  getPermissionState: () => (
    isNativeAndroidRuntime()
      ? 'unsupported'
      : getDesktopNotificationPermissionState()
  ),
  requestPermission: () => (
    isNativeAndroidRuntime()
      ? Promise.resolve('unsupported')
      : requestDesktopNotificationPermission()
  ),
  show: payload => {
    if (isNativeAndroidRuntime()) {
      return;
    }

    showDesktopNotification(payload);
  },
};
