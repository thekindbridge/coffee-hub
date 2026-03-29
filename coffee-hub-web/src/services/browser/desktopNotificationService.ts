import type {
  NotificationPayload,
  NotificationPermissionState,
} from '../platform/notificationAdapter';

export const getDesktopNotificationPermissionState = (): NotificationPermissionState => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
};

export const requestDesktopNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.requestPermission();
};

export const showDesktopNotification = ({
  body,
  icon,
  title,
}: NotificationPayload) => {
  if (getDesktopNotificationPermissionState() !== 'granted') {
    return null;
  }

  return new Notification(title, {
    body,
    icon,
  });
};
