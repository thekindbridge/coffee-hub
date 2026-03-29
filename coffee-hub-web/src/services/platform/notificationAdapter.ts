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

export const notificationAdapter: NotificationAdapter = {
  getPermissionState: getDesktopNotificationPermissionState,
  requestPermission: requestDesktopNotificationPermission,
  show: payload => {
    showDesktopNotification(payload);
  },
};
