import { postApi } from './apiClient';

export type PushRegistrationPermission = 'default' | 'denied' | 'granted';
export type PushRegistrationTokenType = 'expo' | 'fcm';
export type PushRegistrationPlatform = 'android' | 'web';

export const registerPushToken = (
  params: {
    deviceName?: string;
    permission: PushRegistrationPermission;
    platform?: PushRegistrationPlatform;
    token: string;
    tokenType?: PushRegistrationTokenType;
  },
  idToken: string,
) => postApi(
  '/api/notifications',
  params,
  idToken,
);
