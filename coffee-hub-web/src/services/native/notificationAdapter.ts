import type {
  NotificationAdapter,
  NotificationPermissionState,
} from '../platform/notificationAdapter';

const UNSUPPORTED_PERMISSION: NotificationPermissionState = 'unsupported';

export const nativeNotificationAdapter: NotificationAdapter = {
  getPermissionState: () => UNSUPPORTED_PERMISSION,
  requestPermission: async () => UNSUPPORTED_PERMISSION,
  show: () => undefined,
};
