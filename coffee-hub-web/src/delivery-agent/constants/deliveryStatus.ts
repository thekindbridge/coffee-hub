import type { AgentTrackerStatus } from '../../agent/agentTracker';

export const DELIVERY_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
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

export const TRACKER_TONE_CLASS_BY_LIFECYCLE: Record<AgentTrackerStatus['lifecycle'], string> = {
  idle: 'border-white/10 bg-white/5 text-[#cdbbaa]',
  starting: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
  watching: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  restarting: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  stopped: 'border-white/10 bg-white/5 text-[#cdbbaa]',
  completed: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  denied: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
  error: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
};
