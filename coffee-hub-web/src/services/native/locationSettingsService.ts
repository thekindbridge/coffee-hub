import { registerPlugin } from '@capacitor/core';

type CoffeeHubSettingsPlugin = {
  openAppSettings: () => Promise<void>;
  openLocationSettings: () => Promise<void>;
};

const CoffeeHubSettings = registerPlugin<CoffeeHubSettingsPlugin>(
  'CoffeeHubSettings',
);

export const openNativeAppSettings = async () => {
  await CoffeeHubSettings.openAppSettings();
};

export const openNativeLocationSettings = async () => {
  await CoffeeHubSettings.openLocationSettings();
};
