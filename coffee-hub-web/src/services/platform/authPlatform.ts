import { Capacitor } from '@capacitor/core';

type CapacitorBridge = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

type CapacitorWindow = Window & typeof globalThis & {
  Capacitor?: CapacitorBridge;
};

const getCapacitorBridge = (): CapacitorBridge | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return (window as CapacitorWindow).Capacitor ?? Capacitor;
};

export const isBrowserEnvironment = () => (
  typeof window !== 'undefined' && typeof document !== 'undefined'
);

export const getAuthPlatformInfo = () => {
  const bridge = getCapacitorBridge();
  const platform = typeof bridge?.getPlatform === 'function'
    ? bridge.getPlatform()
    : 'web';
  const isNative = typeof bridge?.isNativePlatform === 'function'
    ? bridge.isNativePlatform()
    : false;

  return { isNative, platform };
};

export const isNativeAndroidAuthPlatform = () => {
  const { isNative, platform } = getAuthPlatformInfo();

  return isNative && platform === 'android';
};
