import { DefaultTheme } from '@react-navigation/native';

export const COLORS = {
  primary: '#4B2E2B',
  primaryDark: '#2F1D1A',
  secondary: '#D7CCC8',
  accent: '#C67C4E',
  accentStrong: '#A45E34',
  accentSoft: '#E8CBB6',
  highlight: '#E2B284',
  background: '#F5F1EC',
  backgroundAlt: '#EFE3D8',
  surface: '#FFFDFC',
  surfaceMuted: '#F1E6DE',
  card: '#FFFFFF',
  cardMuted: '#F7EEE7',
  text: '#2E2E2E',
  textMuted: '#7A6C65',
  inkInverse: '#FBF6F1',
  surfaceDark: '#1F1513',
  surfaceDarkAlt: '#33221E',
  border: '#E2D5CC',
  borderStrong: '#D2BAA6',
  success: '#356B4F',
  danger: '#B85C47',
  shadow: 'rgba(75, 46, 43, 0.12)',
  shadowStrong: 'rgba(44, 28, 24, 0.2)',
} as const;

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const SHADOWS = {
  soft: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  card: {
    shadowColor: COLORS.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  floating: {
    shadowColor: COLORS.shadowStrong,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
    notification: COLORS.accent,
  },
};
