import type { AppTheme } from '../../theme';

const customerPalette = {
  background: '#171210',
  surfaceLow: '#201816',
  surfaceHigh: '#2A201D',
  surfaceHighest: '#362925',
  surfaceGlass: 'rgba(66, 51, 46, 0.64)',
  surfaceGlassStrong: 'rgba(82, 64, 58, 0.78)',
  surfaceOverlay: 'rgba(12, 9, 8, 0.6)',
  text: '#F2E7E1',
  textMuted: '#B6A198',
  textSoft: '#D6C4BC',
  caramel: '#C89263',
  blush: '#E7B9AC',
  cocoa: '#4B2E2B',
  gold: '#E1BF83',
  success: '#97C99D',
  successSurface: 'rgba(151, 201, 157, 0.16)',
  warning: '#E7B66E',
  warningSurface: 'rgba(231, 182, 110, 0.18)',
  danger: '#E1A18D',
  dangerSurface: 'rgba(225, 161, 141, 0.16)',
  ghost: 'rgba(242, 231, 225, 0.08)',
  outlineGhost: 'rgba(242, 231, 225, 0.12)',
  ctaGradient: ['#F1CCB4', '#C89263', '#8F624B'] as const,
  ctaGradientDisabled: ['#6B5D59', '#564844', '#443734'] as const,
  heroGradient: ['rgba(8, 6, 5, 0.04)', 'rgba(8, 6, 5, 0.28)', 'rgba(8, 6, 5, 0.92)'] as const,
  offerGradient: ['#2E1F1B', '#6D4A40', '#C48A79'] as const,
};

export const getCustomerPalette = (_theme: AppTheme) => customerPalette;

export const getAmbientShadow = (_theme: AppTheme) => ({
  shadowColor: '#080504',
  shadowOffset: { width: 0, height: 20 },
  shadowOpacity: 0.28,
  shadowRadius: 30,
  elevation: 12,
});
