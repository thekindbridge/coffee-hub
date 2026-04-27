import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
} from '@capacitor/local-notifications';
import {
  PushNotifications,
  type PushNotificationSchema,
} from '@capacitor/push-notifications';
import { notificationAdapter } from './notificationAdapter';
import type { UserRole } from '../../features/app/types';

export type NotificationRole = 'admin' | 'customer' | 'delivery_agent';

type NotificationRoleConfig = {
  channelId: string;
  sound: string;
  vibrationPattern: number[];
};

const ROLE_CONFIGS: Record<NotificationRole, NotificationRoleConfig> = {
  admin: {
    channelId: 'admin_channel',
    sound: 'admin.mp3',
    vibrationPattern: [200, 100, 200],
  },
  customer: {
    channelId: 'customer_channel',
    sound: 'customer.mp3',
    vibrationPattern: [300],
  },
  delivery_agent: {
    channelId: 'agent_channel',
    sound: 'agent.mp3',
    vibrationPattern: [100, 50, 100, 50, 200],
  },
};

const isAndroid = () => Capacitor.getPlatform() === 'android';

export const isNativeAndroidNotificationRuntime = () =>
  Capacitor.isNativePlatform() && isAndroid();

export const resolveNotificationRole = (role: UserRole): NotificationRole => {
  if (role === 'owner' || role === 'admin') {
    return 'admin';
  }

  if (role === 'delivery_agent') {
    return 'delivery_agent';
  }

  return 'customer';
};

export const getNotificationRoleConfig = (role: NotificationRole) => ROLE_CONFIGS[role];

const normalizePermissionState = (
  value: string,
): 'default' | 'denied' | 'granted' | 'prompt' | 'unsupported' => {
  if (value === 'granted' || value === 'denied' || value === 'prompt') {
    return value;
  }

  if (value === 'default') {
    return 'default';
  }

  return 'unsupported';
};

export const getNativeNotificationPermissionState = async () => {
  if (!isNativeAndroidNotificationRuntime()) {
    return 'unsupported' as const;
  }

  const [pushPermission, localPermission] = await Promise.all([
    PushNotifications.checkPermissions(),
    LocalNotifications.checkPermissions(),
  ]);
  const pushState = normalizePermissionState(pushPermission.receive);
  const localState = normalizePermissionState(localPermission.display);

  if (pushState === 'denied' || localState === 'denied') {
    return 'denied' as const;
  }

  if (pushState === 'granted' && localState === 'granted') {
    return 'granted' as const;
  }

  return 'default' as const;
};

export const requestNativeNotificationPermission = async () => {
  if (!isNativeAndroidNotificationRuntime()) {
    return 'unsupported' as const;
  }

  let pushPermission = await PushNotifications.checkPermissions();
  if (pushPermission.receive === 'prompt') {
    pushPermission = await PushNotifications.requestPermissions();
  }

  let localPermission = await LocalNotifications.checkPermissions();
  if (localPermission.display === 'prompt') {
    localPermission = await LocalNotifications.requestPermissions();
  }

  if (pushPermission.receive !== 'granted' || localPermission.display !== 'granted') {
    return 'denied' as const;
  }

  await PushNotifications.register();
  return 'granted' as const;
};

export const ensureNativeNotificationChannels = async () => {
  if (!isNativeAndroidNotificationRuntime()) {
    return;
  }

  const channels = await LocalNotifications.listChannels().catch(() => ({ channels: [] }));
  const existingChannelIds = new Set((channels.channels || []).map(channel => channel.id));

  await Promise.all(
    Object.entries(ROLE_CONFIGS)
      .filter(([, config]) => !existingChannelIds.has(config.channelId))
      .map(([role, config]) =>
        LocalNotifications.createChannel({
          id: config.channelId,
          name: `${role.replace('_', ' ')} notifications`,
          description: `${role.replace('_', ' ')} updates`,
          importance: 5,
          sound: config.sound,
          vibration: true,
        })),
  );
};

export const playRoleNotificationEffect = async ({
  body,
  role,
  tag,
  title,
  url,
}: {
  body: string;
  role: NotificationRole;
  tag?: string;
  title: string;
  url?: string;
}) => {
  if (isNativeAndroidNotificationRuntime()) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(getNotificationRoleConfig(role).vibrationPattern);
    }

    return;
  }

  notificationAdapter.show({
    body,
    title,
  });
};

export const subscribeToNativePushNotifications = async ({
  onNotificationAction,
  onNotificationReceived,
  onRegistrationError,
  onToken,
}: {
  onNotificationAction: (notification: PushNotificationSchema) => void;
  onNotificationReceived: (notification: PushNotificationSchema) => void;
  onRegistrationError: (error: Error) => void;
  onToken: (token: string) => void;
}) => {
  if (!isNativeAndroidNotificationRuntime()) {
    return () => undefined;
  }

  await ensureNativeNotificationChannels();

  const registrationHandle = await PushNotifications.addListener('registration', token => {
    onToken(token.value);
  });

  const registrationErrorHandle = await PushNotifications.addListener('registrationError', error => {
    onRegistrationError(new Error(`${error.error || 'Native push registration failed.'}`));
  });

  const receivedHandle = await PushNotifications.addListener('pushNotificationReceived', notification => {
    onNotificationReceived(notification);
  });

  const actionHandle = await PushNotifications.addListener('pushNotificationActionPerformed', event => {
    onNotificationAction(event.notification);
  });

  return async () => {
    await registrationHandle.remove();
    await registrationErrorHandle.remove();
    await receivedHandle.remove();
    await actionHandle.remove();
  };
};
