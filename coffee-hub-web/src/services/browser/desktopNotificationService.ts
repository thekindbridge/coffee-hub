export type DesktopNotificationPermissionState =
  | 'default'
  | 'denied'
  | 'granted'
  | 'unsupported';

export const getDesktopNotificationPermissionState = (): DesktopNotificationPermissionState => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
};

export const requestDesktopNotificationPermission = async (): Promise<DesktopNotificationPermissionState> => {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.requestPermission();
};

export const showDesktopNotification = ({
  body,
  icon,
  title,
}: {
  title: string;
  body?: string;
  icon?: string;
}) => {
  if (getDesktopNotificationPermissionState() !== 'granted') {
    return null;
  }

  return new Notification(title, {
    body,
    icon,
  });
};
