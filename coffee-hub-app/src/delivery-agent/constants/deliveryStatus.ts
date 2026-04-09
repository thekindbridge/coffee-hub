import type { AgentTrackerStatus } from '../tracking/agentTracker';

export const DELIVERY_NAV_ITEMS = [
  { id: 'dashboard', label: 'Home' },
  { id: 'orders', label: 'Orders' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'profile', label: 'Profile' },
] as const;

export type DeliveryViewId = (typeof DELIVERY_NAV_ITEMS)[number]['id'];

export const DELIVERY_ORDER_FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
] as const;

export type DeliveryOrderFilterId = (typeof DELIVERY_ORDER_FILTERS)[number]['id'];

export const TRACKER_TONE_BY_LIFECYCLE: Record<
  AgentTrackerStatus['lifecycle'],
  'neutral' | 'success' | 'warning' | 'danger'
> = {
  idle: 'neutral',
  starting: 'warning',
  watching: 'success',
  restarting: 'warning',
  stopped: 'neutral',
  completed: 'success',
  denied: 'danger',
  error: 'danger',
};
