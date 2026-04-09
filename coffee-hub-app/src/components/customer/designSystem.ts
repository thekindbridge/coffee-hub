import type { AppTheme } from '../../theme';

export const getCustomerPalette = (theme: AppTheme) => ({
  background: theme.isDark ? '#171210' : '#F5EEE8',
  surfaceLow: theme.isDark ? '#211917' : '#FFF7F1',
  surfaceHigh: theme.isDark ? '#2C221F' : '#FFFDF9',
  surfaceHighest: theme.isDark ? '#382A27' : '#FFFFFF',
  surfaceGlass: theme.isDark ? 'rgba(61, 47, 43, 0.58)' : 'rgba(255, 249, 244, 0.78)',
  surfaceGlassStrong: theme.isDark ? 'rgba(73, 57, 52, 0.72)' : 'rgba(255, 252, 248, 0.88)',
  surfaceOverlay: theme.isDark ? 'rgba(23, 18, 16, 0.78)' : 'rgba(41, 27, 21, 0.18)',
  text: theme.isDark ? '#EBE0DC' : '#2E211C',
  textMuted: theme.isDark ? '#B9A6A0' : '#715D57',
  textSoft: theme.isDark ? '#D4C2BD' : '#5F4943',
  caramel: '#C89263',
  blush: '#E8BCB7',
  cocoa: '#4B2E2B',
  gold: '#E3BF7F',
  success: theme.isDark ? '#98C49B' : '#5B8B63',
  successSurface: theme.isDark ? 'rgba(152, 196, 155, 0.16)' : '#E7F2E8',
  warning: '#E2B06D',
  warningSurface: theme.isDark ? 'rgba(226, 176, 109, 0.16)' : '#FFF1DD',
  danger: theme.isDark ? '#E5A08C' : '#B46A58',
  dangerSurface: theme.isDark ? 'rgba(229, 160, 140, 0.15)' : '#FCEBE6',
  ghost: theme.isDark ? 'rgba(235, 224, 220, 0.08)' : 'rgba(46, 33, 28, 0.06)',
  outlineGhost: theme.isDark ? 'rgba(235, 224, 220, 0.1)' : 'rgba(46, 33, 28, 0.08)',
  ctaGradient: ['#E8BCB7', '#A9786D', '#4B2E2B'] as const,
  ctaGradientDisabled: ['#6B5D59', '#564844', '#443734'] as const,
  heroGradient: ['rgba(23, 18, 16, 0.04)', 'rgba(23, 18, 16, 0.32)', 'rgba(23, 18, 16, 0.94)'] as const,
  offerGradient: ['#37221F', '#6D4A40', '#C48A79'] as const,
});

export const getAmbientShadow = (theme: AppTheme) => ({
  shadowColor: theme.isDark ? '#080605' : '#3B261F',
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: theme.isDark ? 0.28 : 0.12,
  shadowRadius: 36,
  elevation: theme.isDark ? 12 : 8,
});
