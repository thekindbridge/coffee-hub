import type { AppTheme } from '../../theme';
import { getCustomerPalette } from '../customer/designSystem';

export const getDeliveryPalette = (theme: AppTheme) => {
  const customerPalette = getCustomerPalette(theme);

  return {
    ...customerPalette,
    background: theme.isDark ? '#160F0D' : '#F4ECE6',
    backgroundElevated: theme.isDark ? '#1C1412' : '#FFF7F2',
    card: theme.isDark ? '#302723' : '#FFF9F5',
    cardMuted: theme.isDark ? '#241C19' : '#F8EEE7',
    cardStrong: theme.isDark ? '#3A2F2B' : '#F4E6DD',
    chip: theme.isDark ? 'rgba(255, 211, 201, 0.12)' : 'rgba(75, 46, 43, 0.08)',
    chipStrong: theme.isDark ? 'rgba(255, 211, 201, 0.2)' : 'rgba(75, 46, 43, 0.14)',
    divider: theme.isDark ? 'rgba(255, 231, 224, 0.08)' : 'rgba(46, 33, 28, 0.08)',
    mapGlow: theme.isDark ? 'rgba(26, 132, 146, 0.28)' : 'rgba(26, 132, 146, 0.16)',
    mapSurface: theme.isDark ? '#062A34' : '#0E3D49',
    surfaceShadow: theme.isDark ? '#060403' : '#3F2A21',
    successChip: theme.isDark ? 'rgba(123, 197, 147, 0.18)' : '#E7F4EA',
    warningChip: theme.isDark ? 'rgba(226, 176, 109, 0.18)' : '#FFF0DD',
    dangerChip: theme.isDark ? 'rgba(229, 160, 140, 0.18)' : '#FDEAE5',
    primaryGradient: ['#E5BBB5', '#A6776D', '#5A3A34'] as const,
    secondaryGradient: ['#6D4A40', '#C79262'] as const,
    mapGradient: ['#0E4552', '#07313B', '#120C0A'] as const,
    panelGradient: ['#3A2B28', '#2B221E'] as const,
    chartBarIdle: theme.isDark ? '#5A4743' : '#DCC4B7',
    chartBarHighlight: theme.isDark ? '#F0C5BE' : '#D38F77',
  };
};

export const getDeliveryShadow = (theme: AppTheme) => ({
  shadowColor: theme.isDark ? '#040302' : '#3B261F',
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: theme.isDark ? 0.28 : 0.14,
  shadowRadius: 34,
  elevation: theme.isDark ? 12 : 8,
});
