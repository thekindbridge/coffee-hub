import { postApi } from './apiClient';

export type PushRegistrationPermission = 'default' | 'denied' | 'granted';

export const registerPushToken = (
  params: {
    permission: PushRegistrationPermission;
    token: string;
  },
  idToken: string,
) => postApi(
  '/api/notifications',
  params,
  idToken,
);
