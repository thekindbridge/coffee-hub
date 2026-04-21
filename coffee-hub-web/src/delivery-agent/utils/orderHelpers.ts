import type { DeliveryAgent, Order } from '../../types';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 2,
  style: 'currency',
});

export type DeliveryEarningsSummary = {
  averageOrderValue: number;
  completedCount: number;
  lastDeliveredAt: string | null;
  totalAmount: number;
};

const sortByCreatedAtDesc = (orders: Order[]) => [...orders].sort(
  (leftOrder, rightOrder) => (
    new Date(rightOrder.created_at).getTime() - new Date(leftOrder.created_at).getTime()
  ),
);

export const sortDeliveryOrders = (orders: Order[]) => sortByCreatedAtDesc(orders);

export const getOrderAmount = (order: Order) => order.final_total ?? order.total_amount;

export const formatCurrencyAmount = (amount: number) =>
  currencyFormatter.format(Number.isFinite(amount) ? amount : 0);

export const getDeliveryEventTimestamp = (order: Order) =>
  order.delivery_delivered_at ||
  order.delivery_out_for_delivery_at ||
  order.delivery_picked_at ||
  order.delivery_assigned_at ||
  order.created_at;

export const getActiveDeliveryOrders = (orders: Order[]) => sortByCreatedAtDesc(
  orders.filter(order => order.status_code === 'OUT_FOR_DELIVERY'),
);

export const getCompletedDeliveryOrders = (orders: Order[]) => sortByCreatedAtDesc(
  orders.filter(order => order.status_code === 'DELIVERED'),
);

export const buildDeliveryEarningsSummary = (orders: Order[]): DeliveryEarningsSummary => {
  const completedOrders = getCompletedDeliveryOrders(orders);
  const totalAmount = completedOrders.reduce(
    (runningTotal, order) => runningTotal + getOrderAmount(order),
    0,
  );

  return {
    averageOrderValue: completedOrders.length > 0 ? totalAmount / completedOrders.length : 0,
    completedCount: completedOrders.length,
    lastDeliveredAt: completedOrders[0]?.delivery_delivered_at || completedOrders[0]?.created_at || null,
    totalAmount,
  };
};

export const buildMapsSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const normalizePhoneForTel = (phone: string) => phone.replace(/[^\d+]/g, '');

export const resolveDeliveryAgentId = (
  order: Order | null,
  deliveryAgent: DeliveryAgent | null,
  normalizedCurrentPhone: string,
) => (
  order?.delivery_agent_id ||
  deliveryAgent?.id ||
  normalizedCurrentPhone
);
