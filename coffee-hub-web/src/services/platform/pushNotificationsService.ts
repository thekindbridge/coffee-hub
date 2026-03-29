import {
  clearPushPermissionBannerDismissal,
  detectBrowserMessagingSupport,
  dismissPushPermissionBanner,
  getBrowserPushPermissionState,
  isPushPermissionBannerDismissed,
  requestBrowserPushPermission,
  subscribeToForegroundMessages,
  syncBrowserPushRegistration,
  type ForegroundNotification,
  type PushPermissionState,
} from '../browser/pushNotificationsService';

export type { ForegroundNotification, PushPermissionState };

export const pushNotificationsPlatformService = {
  clearPushPermissionBannerDismissal,
  detectMessagingSupport: detectBrowserMessagingSupport,
  dismissPushPermissionBanner,
  getPermissionState: getBrowserPushPermissionState,
  isPushPermissionBannerDismissed,
  requestPermission: requestBrowserPushPermission,
  subscribeToForegroundMessages,
  syncRegistration: syncBrowserPushRegistration,
};
