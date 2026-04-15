import type { ViewStyle } from 'react-native';
import type { MenuItem, OrderStatusCode, Offer } from '../../types';
import { normalizeOrderStatusCode } from '../../shared/orderStatus';

export const adminPalette = {
  background: '#171210',
  backdrop: '#1D1613',
  sectionGlass: 'rgba(49, 38, 34, 0.74)',
  cardGlass: 'rgba(63, 49, 44, 0.68)',
  floatingGlass: 'rgba(82, 65, 58, 0.82)',
  overlay: 'rgba(11, 8, 7, 0.58)',
  text: '#F2E7E1',
  textMuted: '#B6A198',
  textSoft: '#D8C5BC',
  caramel: '#C89263',
  caramelSoft: '#E3BE9A',
  blush: '#E7B9AC',
  gold: '#E1BF83',
  success: '#97C99D',
  successSurface: 'rgba(151, 201, 157, 0.16)',
  warning: '#E7B66E',
  warningSurface: 'rgba(231, 182, 110, 0.18)',
  danger: '#E1A18D',
  dangerSurface: 'rgba(225, 161, 141, 0.16)',
  ghost: 'rgba(242, 231, 225, 0.08)',
  ghostStrong: 'rgba(242, 231, 225, 0.14)',
  progressTrack: 'rgba(242, 231, 225, 0.08)',
  buttonGradient: ['#F1CCB4', '#C89263', '#8F624B'] as const,
  offerGradients: [
    ['#30211D', '#704B41', '#CC9876'] as const,
    ['#261C1A', '#56453F', '#B98C67'] as const,
    ['#2B1F1C', '#6E5846', '#D6A57D'] as const,
  ] as const,
};

export const adminSpacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const adminRadius = {
  card: 24,
  control: 20,
  pill: 999,
} as const;

export const adminShadow: ViewStyle = {
  shadowColor: '#080504',
  shadowOffset: { width: 0, height: 22 },
  shadowOpacity: 0.26,
  shadowRadius: 34,
  elevation: 12,
};

export const getAdminSurfaceColor = (depth: 'section' | 'card' | 'floating' = 'card') => {
  if (depth === 'floating') {
    return adminPalette.floatingGlass;
  }

  if (depth === 'section') {
    return adminPalette.sectionGlass;
  }

  return adminPalette.cardGlass;
};

export type AdminBadgeTone =
  | 'neutral'
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'progress'
  | 'delivery'
  | 'success'
  | 'danger'
  | 'member';

export type AdminOrderStage = 'Pending Review' | 'In Preparation' | 'Ready for Pickup';

export const getAdminStatusTone = (statusCode: OrderStatusCode | string): AdminBadgeTone => {
  const normalizedStatus = normalizeOrderStatusCode(statusCode);

  switch (normalizedStatus) {
    case 'PENDING':
      return 'pending';
    case 'ACCEPTED':
      return 'accepted';
    case 'PREPARING':
      return 'preparing';
    case 'OUT_FOR_DELIVERY':
      return 'delivery';
    case 'DELIVERED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
};

export const getAdminOrderStage = (statusCode: OrderStatusCode | string): AdminOrderStage => {
  const normalizedStatus = normalizeOrderStatusCode(statusCode);

  switch (normalizedStatus) {
    case 'PENDING':
      return 'Pending Review';
    case 'ACCEPTED':
    case 'PREPARING':
      return 'In Preparation';
    case 'OUT_FOR_DELIVERY':
    case 'DELIVERED':
      return 'Ready for Pickup';
    default:
      return 'Pending Review';
  }
};

export const getAdminOrderStageOptions = (
  statusCode: OrderStatusCode | string,
): AdminOrderStage[] => {
  const normalizedStatus = normalizeOrderStatusCode(statusCode);

  switch (normalizedStatus) {
    case 'PENDING':
      return ['Pending Review', 'In Preparation'];
    case 'ACCEPTED':
      return ['In Preparation'];
    case 'PREPARING':
      return ['In Preparation', 'Ready for Pickup'];
    case 'OUT_FOR_DELIVERY':
      return ['Ready for Pickup'];
    default:
      return [getAdminOrderStage(normalizedStatus)];
  }
};

export const canCancelAdminOrder = (statusCode: OrderStatusCode | string) => {
  const normalizedStatus = normalizeOrderStatusCode(statusCode);
  return normalizedStatus === 'PENDING' || normalizedStatus === 'ACCEPTED';
};

export const canNotifyAdminOrder = (statusCode: OrderStatusCode | string) => (
  normalizeOrderStatusCode(statusCode) === 'OUT_FOR_DELIVERY'
);

export const getAdminProductTag = (item: MenuItem): {
  label: 'OUT OF STOCK' | 'VEGAN' | 'SIGNATURE';
  tone: AdminBadgeTone;
} => {
  if (!item.is_available) {
    return {
      label: 'OUT OF STOCK',
      tone: 'danger',
    };
  }

  if (item.is_veg) {
    return {
      label: 'VEGAN',
      tone: 'success',
    };
  }

  return {
    label: 'SIGNATURE',
    tone: 'member',
  };
};

export const getAdminOfferGradient = (offer: Offer) => {
  const seed = `${offer.couponCode}${offer.title}`.trim();
  const index = seed
    .split('')
    .reduce((sum, character) => sum + character.charCodeAt(0), 0) % adminPalette.offerGradients.length;

  return adminPalette.offerGradients[index];
};
