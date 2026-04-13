import { SHOP_LOCATION } from '../../shared/shopLocation';
import type { DeliveryLocation, DeliverySession, Order } from '../../types';
import {
  getDeliveryOrderState,
  getDeliveryOrderStateRank,
  getOrderAmount,
  type DeliveryOrderState,
} from './orderHelpers';

export type DeliveryTimelineStep = {
  description?: string;
  state: 'completed' | 'current' | 'pending';
  title: string;
  tone: 'success' | 'warning' | 'muted';
};

type OrderStateOptions = {
  isCurrentOrder?: boolean;
  isTracking?: boolean;
  session?: DeliverySession | null;
};

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const toDisplayDate = (value?: string | null) => {
  const timestamp = toTimestamp(value);
  return timestamp ? new Date(timestamp) : null;
};

const toQuantity = (order: Order) => (
  order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
);

const toRadians = (value: number) => value * (Math.PI / 180);

export const getGreeting = (date = new Date()) => {
  const hours = date.getHours();

  if (hours < 12) {
    return 'Good Morning';
  }

  if (hours < 17) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
};

export const getFirstName = (value?: string | null) => (
  value?.trim().split(/\s+/)[0] || 'Partner'
);

export const getInitials = (value?: string | null) => (
  value
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'CH'
);

export const getOrderPrimaryItem = (order: Order) => (
  order.items?.[0]?.name || 'Signature roast'
);

export const getOrderItemSummary = (order: Order) => {
  const totalItems = toQuantity(order);
  if (totalItems <= 1) {
    return getOrderPrimaryItem(order);
  }

  return `${totalItems}x ${getOrderPrimaryItem(order)}`;
};

export const getOrderSubtitle = (order: Order) => (
  order.customer_name || order.address || SHOP_LOCATION.name
);

export const getOrderStatusTag = (
  order: Order,
  isTracking: boolean,
  isCurrentOrder: boolean,
) => {
  const state = getDeliveryOrderState(order, {
    isCurrentOrder,
    isTracking,
  });

  switch (state) {
    case 'completed':
      return 'Delivered';
    case 'delivering':
      return 'Delivering';
    case 'picked':
      return 'Picked Up';
    case 'assigned':
    default:
      return 'Assigned';
  }
};

export const getOrderStatusTone = (tag: string) => {
  const normalizedTag = tag.trim().toLowerCase();
  if (normalizedTag === 'delivered') {
    return 'success' as const;
  }
  if (
    normalizedTag === 'assigned' ||
    normalizedTag === 'picked up' ||
    normalizedTag === 'delivering'
  ) {
    return 'warning' as const;
  }

  return 'neutral' as const;
};

export const getDeliveryStateLabel = (state: DeliveryOrderState) => {
  switch (state) {
    case 'assigned':
      return 'Assigned';
    case 'picked':
      return 'Picked Up';
    case 'delivering':
      return 'Delivering';
    case 'completed':
      return 'Delivered';
    default:
      return 'Assigned';
  }
};

export const getDeliveryStateEyebrow = (state: DeliveryOrderState) => {
  switch (state) {
    case 'assigned':
      return 'Assignment Ready';
    case 'picked':
      return 'Pickup Confirmed';
    case 'delivering':
      return 'Route In Progress';
    case 'completed':
      return 'Delivery Complete';
    default:
      return 'Assignment Ready';
  }
};

export const getDeliveryStatePrimaryAction = (state: DeliveryOrderState) => {
  switch (state) {
    case 'assigned':
      return 'Accept';
    case 'picked':
    case 'delivering':
      return 'Navigate';
    case 'completed':
      return 'Details';
    default:
      return 'Details';
  }
};

export const getDeliveryStateProgress = (state: DeliveryOrderState) => {
  switch (state) {
    case 'assigned':
      return 0.25;
    case 'picked':
      return 0.5;
    case 'delivering':
      return 0.75;
    case 'completed':
      return 1;
    default:
      return 0.25;
  }
};

export const getDeliveryState = (order: Order, options?: OrderStateOptions) => (
  getDeliveryOrderState(order, {
    isCurrentOrder: options?.isCurrentOrder,
    isTracking: options?.isTracking,
    sessionStatus: options?.session?.status || null,
  })
);

export const calculateDistanceKm = (
  from: DeliveryLocation | null | undefined,
  to: DeliveryLocation | null | undefined,
) => {
  if (!from || !to) {
    return null;
  }

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(from.lat))
    * Math.cos(toRadians(to.lat))
    * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const getStoreToCustomerDistanceKm = (order: Order) => (
  calculateDistanceKm(
    { lat: SHOP_LOCATION.lat, lng: SHOP_LOCATION.lng },
    order.customer_location,
  )
);

export const getAgentToCustomerDistanceKm = (
  order: Order,
  currentLocation?: DeliveryLocation | null,
) => (
  calculateDistanceKm(currentLocation || order.delivery_location || null, order.customer_location)
  || getStoreToCustomerDistanceKm(order)
);

export const formatDistanceKm = (distanceKm: number | null, suffix = 'away') => {
  if (distanceKm === null) {
    return 'Route syncing';
  }

  const rounded = distanceKm < 1
    ? distanceKm.toFixed(1)
    : distanceKm.toFixed(distanceKm >= 10 ? 0 : 1);

  return `${rounded} km ${suffix}`.trim();
};

export const estimateEtaMinutes = (
  distanceKm: number | null,
  isTracking = false,
) => {
  if (distanceKm === null) {
    return null;
  }

  const speed = isTracking ? 24 : 18;
  const baseMinutes = Math.round((distanceKm / speed) * 60);
  return clamp(baseMinutes + 4, 6, 42);
};

export const formatEta = (etaMinutes: number | null) => (
  etaMinutes === null ? 'ETA syncing' : `${etaMinutes} mins`
);

export const buildWeeklyChart = (
  orders: Order[],
  amountSelector: (order: Order) => number = getOrderAmount,
) => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() - 6);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const dayStart = new Date(current);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const total = orders.reduce((sum, order) => {
      const createdAt = toDisplayDate(order.delivery_delivered_at || order.created_at);
      if (!createdAt || createdAt < dayStart || createdAt >= dayEnd) {
        return sum;
      }

      return sum + amountSelector(order);
    }, 0);

    return {
      label: WEEKDAY_LABELS[current.getDay()],
      total,
    };
  });
};

export const getTodayEarnings = (
  orders: Order[],
  amountSelector: (order: Order) => number = getOrderAmount,
) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  return orders.reduce((sum, order) => {
    const deliveredAt = toDisplayDate(order.delivery_delivered_at || order.created_at);
    if (!deliveredAt || deliveredAt < start) {
      return sum;
    }

    return sum + amountSelector(order);
  }, 0);
};

export const getTotalBeans = (orders: Order[]) => (
  orders.reduce((sum, order) => sum + toQuantity(order), 0)
);

export const getTotalTips = (orders: Order[]) => (
  orders.reduce((sum, order) => sum + (order.delivery_fee ?? 0), 0)
);

export const getAveragePerDelivery = (
  orders: Order[],
  amountSelector: (order: Order) => number = getOrderAmount,
) => (
  orders.length ? orders.reduce((sum, order) => sum + amountSelector(order), 0) / orders.length : 0
);

export const getAverageDeliveryMinutes = (orders: Order[]) => {
  const durations = orders.flatMap(order => {
    const startedAt = toTimestamp(
      order.delivery_out_for_delivery_at ||
      order.delivery_picked_at ||
      order.delivery_assigned_at,
    );
    const deliveredAt = toTimestamp(order.delivery_delivered_at);
    if (!startedAt || !deliveredAt || deliveredAt <= startedAt) {
      return [];
    }

    return [(deliveredAt - startedAt) / (1000 * 60)];
  });

  if (!durations.length) {
    return null;
  }

  return durations.reduce((sum, value) => sum + value, 0) / durations.length;
};

export const getPartnerLevel = (completedDeliveries: number) => {
  if (completedDeliveries >= 150) {
    return 'Level 4 Partner';
  }
  if (completedDeliveries >= 80) {
    return 'Level 3 Partner';
  }
  if (completedDeliveries >= 30) {
    return 'Level 2 Partner';
  }

  return 'Level 1 Partner';
};

export const getDerivedPartnerRating = (
  completedDeliveries: number,
  averageDeliveryMinutes: number | null,
) => {
  if (!completedDeliveries) {
    return 4.8;
  }

  const minutesScore = averageDeliveryMinutes === null
    ? 0.08
    : clamp((24 - averageDeliveryMinutes) / 60, -0.08, 0.14);

  return clamp(4.74 + minutesScore + Math.min(completedDeliveries / 800, 0.12), 4.72, 4.98);
};

export const buildDeliveryTimeline = (
  order: Order,
  session: DeliverySession | null,
  isTracking: boolean,
) => {
  const state = getDeliveryState(order, {
    isCurrentOrder: true,
    isTracking,
    session,
  });
  const currentRank = getDeliveryOrderStateRank(state);
  const assignedRank = getDeliveryOrderStateRank('assigned');
  const pickedRank = getDeliveryOrderStateRank('picked');
  const deliveringRank = getDeliveryOrderStateRank('delivering');
  const completedRank = getDeliveryOrderStateRank('completed');

  const resolveTimelineState = (targetRank: number): DeliveryTimelineStep['state'] => {
    if (currentRank > targetRank) {
      return 'completed';
    }
    if (currentRank === targetRank) {
      return 'current';
    }
    return 'pending';
  };

  return [
    {
      title: 'Assigned',
      description: order.delivery_assigned_at
        ? 'Dispatch assigned this order to your delivery queue.'
        : 'Waiting for dispatch confirmation.',
      state: resolveTimelineState(assignedRank),
      tone: 'success',
    },
    {
      title: 'Picked Up',
      description: order.delivery_picked_at
        ? 'Pickup has been confirmed for this order.'
        : 'Confirm pickup once the order is in hand.',
      state: resolveTimelineState(pickedRank),
      tone: 'success',
    },
    {
      title: 'Out for Delivery',
      description: isTracking || session?.status === 'active'
        ? 'Live delivery tracking is active for this route.'
        : 'Start navigation to move this order into the delivery stage.',
      state: resolveTimelineState(deliveringRank),
      tone: 'warning',
    },
    {
      title: 'Delivered',
      description: order.delivery_delivered_at
        ? 'Completed and marked as delivered.'
        : 'The final handoff will be captured here once complete.',
      state: resolveTimelineState(completedRank),
      tone: 'muted',
    },
  ] as DeliveryTimelineStep[];
};

export const sortRecentOrders = (orders: Order[]) => [...orders].sort((left, right) => {
  const rightTime = toTimestamp(right.delivery_delivered_at || right.created_at) || 0;
  const leftTime = toTimestamp(left.delivery_delivered_at || left.created_at) || 0;
  return rightTime - leftTime;
});
