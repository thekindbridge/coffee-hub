import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import type { ViewStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  hero: 28,
  pill: 999,
} as const;

export const typography = {
  heading: 30,
  subheading: 18,
  body: 14,
  caption: 12,
  eyebrow: 11,
} as const;

type ThemeColors = {
  accent: string;
  background: string;
  backgroundAlt: string;
  border: string;
  borderStrong: string;
  card: string;
  danger: string;
  dangerSurface: string;
  input: string;
  onPrimary: string;
  onSecondary: string;
  overlay: string;
  primary: string;
  secondary: string;
  shadow: string;
  shadowStrong: string;
  success: string;
  successSurface: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  tabBar: string;
  tag: string;
  text: string;
  textInverse: string;
  textMuted: string;
  warning: string;
  warningSurface: string;
};

type ThemeGradients = {
  accent: [string, string];
  hero: [string, string, string];
  softCard: [string, string];
};

type ThemeShadows = {
  card: ViewStyle;
  floating: ViewStyle;
  soft: ViewStyle;
};

export type AppTheme = {
  colors: ThemeColors;
  gradients: ThemeGradients;
  isDark: boolean;
  mode: ThemeMode;
  navigationTheme: NavigationTheme;
  radius: typeof radius;
  shadows: ThemeShadows;
  spacing: typeof spacing;
  typography: typeof typography;
};

const buildShadows = (
  colors: Pick<ThemeColors, 'shadow' | 'shadowStrong'>,
  isDark: boolean,
): ThemeShadows => ({
  soft: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.38 : 0.12,
    shadowRadius: 18,
    elevation: isDark ? 5 : 3,
  },
  card: {
    shadowColor: colors.shadowStrong,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: isDark ? 0.48 : 0.2,
    shadowRadius: 24,
    elevation: isDark ? 10 : 6,
  },
  floating: {
    shadowColor: colors.shadowStrong,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: isDark ? 0.56 : 0.24,
    shadowRadius: 30,
    elevation: isDark ? 12 : 8,
  },
});

const createNavigationTheme = (
  baseTheme: NavigationTheme,
  themeColors: ThemeColors,
  isDark: boolean,
): NavigationTheme => ({
  ...baseTheme,
  dark: isDark,
  colors: {
    ...baseTheme.colors,
    background: themeColors.background,
    border: themeColors.border,
    card: themeColors.surface,
    notification: themeColors.accent,
    primary: themeColors.primary,
    text: themeColors.text,
  },
});

const lightColors: ThemeColors = {
  accent: '#C67C4E',
  background: '#F5F1EC',
  backgroundAlt: '#EEE6DD',
  border: '#E0E0E0',
  borderStrong: '#D6CCC2',
  card: '#FFFFFF',
  danger: '#B85C47',
  dangerSurface: '#FFF1ED',
  input: '#FCFAF7',
  onPrimary: '#F8F4EF',
  onSecondary: '#2E1D15',
  overlay: 'rgba(18, 12, 10, 0.68)',
  primary: '#4B2E2B',
  secondary: '#C67C4E',
  shadow: 'rgba(75, 46, 43, 0.12)',
  shadowStrong: 'rgba(46, 30, 24, 0.24)',
  success: '#5A8F68',
  successSurface: '#E9F5EC',
  surface: '#FFFFFF',
  surfaceMuted: '#EFE7DE',
  surfaceRaised: '#FFF9F4',
  tabBar: 'rgba(255, 255, 255, 0.96)',
  tag: 'rgba(198, 124, 78, 0.12)',
  text: '#2E2E2E',
  textInverse: '#F8F4EF',
  textMuted: '#7A6C65',
  warning: '#9B6A2C',
  warningSurface: '#FFF3E0',
};

const darkColors: ThemeColors = {
  accent: '#C67C4E',
  background: '#121212',
  backgroundAlt: '#181614',
  border: '#2A2A2A',
  borderStrong: '#3A3430',
  card: '#1E1E1E',
  danger: '#E38C72',
  dangerSurface: 'rgba(227, 140, 114, 0.14)',
  input: '#23201D',
  onPrimary: '#1A130F',
  onSecondary: '#F5F5F5',
  overlay: 'rgba(0, 0, 0, 0.76)',
  primary: '#C67C4E',
  secondary: '#4B2E2B',
  shadow: 'rgba(0, 0, 0, 0.28)',
  shadowStrong: 'rgba(0, 0, 0, 0.46)',
  success: '#87C494',
  successSurface: 'rgba(135, 196, 148, 0.14)',
  surface: '#1A1A1A',
  surfaceMuted: '#241F1C',
  surfaceRaised: '#1E1E1E',
  tabBar: 'rgba(24, 24, 24, 0.98)',
  tag: 'rgba(198, 124, 78, 0.16)',
  text: '#F5F5F5',
  textInverse: '#121212',
  textMuted: '#B6ACA6',
  warning: '#E3B05E',
  warningSurface: 'rgba(227, 176, 94, 0.16)',
};

export const lightTheme: AppTheme = {
  colors: lightColors,
  gradients: {
    accent: ['#4B2E2B', '#C67C4E'],
    hero: ['rgba(12, 8, 7, 0.18)', 'rgba(12, 8, 7, 0.62)', '#1F1411'],
    softCard: ['#FFFDFC', '#F3EAE1'],
  },
  isDark: false,
  mode: 'light',
  navigationTheme: createNavigationTheme(DefaultTheme, lightColors, false),
  radius,
  shadows: buildShadows(lightColors, false),
  spacing,
  typography,
};

export const darkTheme: AppTheme = {
  colors: darkColors,
  gradients: {
    accent: ['#4B2E2B', '#C67C4E'],
    hero: ['rgba(0, 0, 0, 0.18)', 'rgba(0, 0, 0, 0.64)', '#0C0C0C'],
    softCard: ['#24201D', '#1A1A1A'],
  },
  isDark: true,
  mode: 'dark',
  navigationTheme: createNavigationTheme(DarkTheme, darkColors, true),
  radius,
  shadows: buildShadows(darkColors, true),
  spacing,
  typography,
};

export const getThemeByMode = (mode: ThemeMode) => (
  mode === 'dark' ? darkTheme : lightTheme
);
