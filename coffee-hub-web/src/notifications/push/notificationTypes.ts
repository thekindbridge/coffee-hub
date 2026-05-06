export type PushPermissionState =
  | NotificationPermission
  | 'unsupported';

export type PushRuntime =
  | 'android'
  | 'browser'
  | 'unsupported';

export type PushRegistrationPlatform =
  | 'android'
  | 'web';

export type PushTokenType =
  | 'expo'
  | 'fcm';

export type PushRecipientRole =
  | 'admin'
  | 'customer'
  | 'delivery_agent';

export type ForegroundPushNotification = {
  id: string;
  title: string;
  body: string;
  url: string;
  eventId: string;
  role: PushRecipientRole;
  tag: string;
  type: string;
};

export type NotificationRouteData = {
  body: string;
  eventId: string;
  orderId: string;
  role: PushRecipientRole;
  status: string;
  tag: string;
  title: string;
  type: string;
  url: string;
};
