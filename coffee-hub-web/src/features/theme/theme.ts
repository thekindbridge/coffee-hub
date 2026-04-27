import { storageAdapter } from '../../services/platform/storageAdapter';

export type AppTheme = 'dark' | 'light';

export const APP_THEME_STORAGE_KEY = 'coffee_hub_theme';

export const normalizeAppTheme = (value: string | null | undefined): AppTheme =>
  value === 'light' ? 'light' : 'dark';

export const readStoredAppTheme = (): AppTheme => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return normalizeAppTheme(storageAdapter.read(APP_THEME_STORAGE_KEY));
};

export const persistAppTheme = (theme: AppTheme) => {
  if (typeof window === 'undefined') {
    return;
  }

  storageAdapter.write(APP_THEME_STORAGE_KEY, theme);
};

export const applyAppThemeToDocument = (theme: AppTheme) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.body?.setAttribute('data-theme', theme);
};
