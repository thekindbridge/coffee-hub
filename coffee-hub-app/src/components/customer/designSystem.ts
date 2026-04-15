import type { AppTheme } from '../../theme';

const customerPalette = {
  background: '#1A120B',
  surfaceLow: '#221A13',
  surfaceHigh: '#322820',
  surfaceHighest: '#3D332B',
  surfaceGlass: 'rgba(61, 51, 43, 0.58)',
  surfaceGlassStrong: 'rgba(79, 69, 64, 0.72)',
  surfaceOverlay: 'rgba(12, 9, 8, 0.6)',
  text: '#F1DFD3',
  textMuted: 'rgba(211, 195, 189, 0.76)',
  textSoft: '#E3D4CC',
  caramel: '#CEC79D',
  blush: '#DEC1B3',
  cocoa: '#574238',
  gold: '#EBE4B7',
  success: '#97C99D',
  successSurface: 'rgba(151, 201, 157, 0.16)',
  warning: '#E7B66E',
  warningSurface: 'rgba(231, 182, 110, 0.18)',
  danger: '#E1A18D',
  dangerSurface: 'rgba(225, 161, 141, 0.16)',
  ghost: 'rgba(241, 223, 211, 0.08)',
  outlineGhost: 'rgba(206, 199, 157, 0.12)',
  ctaGradient: ['#EBE4B7', '#CEC79D', '#9C976F'] as const,
  ctaGradientDisabled: ['#6B6557', '#5A544A', '#433C35'] as const,
  heroGradient: ['rgba(20, 13, 6, 0.04)', 'rgba(20, 13, 6, 0.24)', 'rgba(20, 13, 6, 0.92)'] as const,
  offerGradient: ['#271E16', '#574238', '#DEC1B3'] as const,
};

export const getCustomerPalette = (_theme: AppTheme) => customerPalette;

export const CUSTOMER_TAB_BAR_HORIZONTAL_MARGIN = 16;
export const CUSTOMER_TAB_BAR_BOTTOM_MARGIN = 10;
export const CUSTOMER_TAB_BAR_HEIGHT = 60;
export const CUSTOMER_SCREEN_BOTTOM_PADDING = 70;
export const CUSTOMER_FLOATING_CART_BOTTOM_GAP = 14;
export const CUSTOMER_FLOATING_CART_BOTTOM_OFFSET = (
  CUSTOMER_TAB_BAR_BOTTOM_MARGIN + CUSTOMER_TAB_BAR_HEIGHT + CUSTOMER_FLOATING_CART_BOTTOM_GAP
);
export const CUSTOMER_FLOATING_CART_MIN_HEIGHT = 56;
export const CUSTOMER_SCREEN_BOTTOM_PADDING_WITH_CART = (
  CUSTOMER_FLOATING_CART_BOTTOM_OFFSET + CUSTOMER_FLOATING_CART_MIN_HEIGHT + 14
);

export const getAmbientShadow = (_theme: AppTheme) => ({
  shadowColor: '#574238',
  shadowOffset: { width: 0, height: 20 },
  shadowOpacity: 0.16,
  shadowRadius: 34,
  elevation: 12,
});
