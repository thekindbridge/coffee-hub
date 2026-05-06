import { Capacitor } from '@capacitor/core';
import {
  registerPushToken,
  type PushRegistrationPermission,
  type PushRegistrationTokenType,
} from '../../services/api/notificationsService';
import { storageAdapter } from '../../services/platform/storageAdapter';
import type {
  PushRegistrationPlatform,
  PushRuntime,
} from './notificationTypes';

const LAST_PUSH_TOKEN_KEY = 'coffee_hub_last_push_token';

const readUserAgentLabel = () => {
  if (typeof navigator === 'undefined') {
    return '';
  }

  return navigator.userAgent.trim().slice(0, 160);
};

export const getPushRuntime = (): PushRuntime => {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return 'android';
  }

  if (typeof window !== 'undefined') {
    return 'browser';
  }

  return 'unsupported';
};

export const getPushRegistrationPlatform = (
  runtime: PushRuntime,
): PushRegistrationPlatform => (
  runtime === 'android'
    ? 'android'
    : 'web'
);

export const getCachedPushToken = () =>
  storageAdapter.read(LAST_PUSH_TOKEN_KEY).trim();

export const cachePushToken = (token: string) => {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    storageAdapter.remove(LAST_PUSH_TOKEN_KEY);
    return;
  }

  storageAdapter.write(LAST_PUSH_TOKEN_KEY, normalizedToken);
};

export const clearCachedPushToken = () => {
  storageAdapter.remove(LAST_PUSH_TOKEN_KEY);
};

export const buildPushRegistrationSignature = (
  permission: PushRegistrationPermission,
  token: string,
) => `${permission}:${token.trim()}`;

export const inferDeviceName = (runtime: PushRuntime) => {
  const userAgentLabel = readUserAgentLabel();
  if (runtime === 'android') {
    return userAgentLabel || 'Android device';
  }

  if (runtime === 'browser') {
    return userAgentLabel || 'Web browser';
  }

  return 'Unknown device';
};

export const syncPushRegistration = async ({
  deviceName,
  idToken,
  permission,
  platform,
  token,
  tokenType = 'fcm',
}: {
  deviceName: string;
  idToken: string;
  permission: PushRegistrationPermission;
  platform: PushRegistrationPlatform;
  token: string;
  tokenType?: PushRegistrationTokenType;
}) => {
  const normalizedToken = token.trim();

  await registerPushToken(
    {
      deviceName,
      permission,
      platform,
      token: normalizedToken,
      tokenType,
    },
    idToken,
  );

  if (permission === 'granted' && normalizedToken) {
    cachePushToken(normalizedToken);
    return;
  }

  clearCachedPushToken();
};
