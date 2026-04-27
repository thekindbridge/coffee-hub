import { postApi } from './apiClient';

export type PushRegistrationPermission = 'default' | 'denied' | 'granted';
export type PushRegistrationTokenType = 'expo' | 'fcm';

export const registerPushToken = (
  params: {
    permission: PushRegistrationPermission;
    token: string;
    tokenType?: PushRegistrationTokenType;
  },
  idToken: string,
) => postApi(
  '/api/notifications',
  params,
  idToken,
);
