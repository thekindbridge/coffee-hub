import { DefaultTheme } from '@react-navigation/native';

export const COLORS = {
  background: '#F6EFE7',
  surface: '#FFF9F2',
  surfaceMuted: '#EADFD3',
  card: '#FFFFFF',
  cardMuted: '#F3E7DA',
  text: '#26150E',
  textMuted: '#7A6456',
  accent: '#7C4A2D',
  accentStrong: '#4C2D1D',
  secondary: '#C08A5D',
  highlight: '#E0A641',
  inkInverse: '#F5EDE3',
  surfaceDark: '#120D0B',
  surfaceDarkAlt: '#1A1411',
  border: '#E3D3C5',
  success: '#326B53',
  shadow: 'rgba(38, 21, 14, 0.08)',
  shadowStrong: 'rgba(38, 21, 14, 0.18)',
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
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.accent,
    notification: COLORS.accentStrong,
  },
};
