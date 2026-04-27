export const DELIVERY_NAV_ITEMS = [
  { id: 'orders', label: 'Orders' },
] as const;

export type DeliveryViewId = (typeof DELIVERY_NAV_ITEMS)[number]['id'];
