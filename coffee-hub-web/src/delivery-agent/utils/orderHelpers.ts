import type { DeliveryAgent, DeliverySession, Order } from '../../types';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 2,
  style: 'currency',
});

export type AgentOrderSections = {
  completedOrders: Order[];
  executableOrders: Order[];
  inProgressOrders: Order[];
  newOrders: Order[];
};

const sortByCreatedAtDesc = (orders: Order[]) => [...orders].sort(
  (leftOrder, rightOrder) => (
    new Date(rightOrder.created_at).getTime() - new Date(leftOrder.created_at).getTime()
  ),
);

const buildSessionLookup = (sessions: DeliverySession[]) => new Map(
  sessions
    .map(session => [session.order_doc_id || session.order_id, session] as const)
    .filter(([orderDocId]) => Boolean(orderDocId)),
);

export const sortDeliveryOrders = (orders: Order[]) => sortByCreatedAtDesc(orders);

export const getOrderAmount = (order: Order) => order.final_total ?? order.total_amount;

export const formatCurrencyAmount = (amount: number) =>
  currencyFormatter.format(Number.isFinite(amount) ? amount : 0);

export const formatAgentAvailabilityLabel = (deliveryAgent: DeliveryAgent | null) => (
  deliveryAgent?.is_active === false ? 'Offline' : 'Online'
);

export const buildMapsSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const normalizePhoneForTel = (phone: string) => phone.replace(/[^\d+]/g, '');

export const getOrderItemsSummary = (order: Order) => {
  if (!order.items || order.items.length === 0) {
    return 'Items syncing from Firebase...';
  }

  return order.items
    .map(item => `${item.name} x${item.quantity}`)
    .join(', ');
};

export const getSectionStatusLabel = (
  order: Order,
  session: DeliverySession | null,
) => {
  if (order.status_code === 'DELIVERED') {
    return 'Completed';
  }

  if (session?.status === 'active') {
    return 'In Progress';
  }

  return 'New Order';
};

export const classifyAgentOrders = (
  orders: Order[],
  deliverySessions: DeliverySession[],
): AgentOrderSections => {
  const sessionLookup = buildSessionLookup(deliverySessions);
  const executableOrders = sortByCreatedAtDesc(
    orders.filter(order =>
      order.status_code === 'OUT_FOR_DELIVERY' ||
      order.status_code === 'DELIVERED',
    ),
  );

  const inProgressOrders = sortByCreatedAtDesc(
    executableOrders.filter(order =>
      order.status_code === 'OUT_FOR_DELIVERY' &&
      sessionLookup.get(order.doc_id)?.status === 'active',
    ),
  );

  const newOrders = sortByCreatedAtDesc(
    executableOrders.filter(order =>
      order.status_code === 'OUT_FOR_DELIVERY' &&
      sessionLookup.get(order.doc_id)?.status !== 'active',
    ),
  );

  const completedOrders = sortByCreatedAtDesc(
    executableOrders.filter(order => order.status_code === 'DELIVERED'),
  );

  return {
    completedOrders,
    executableOrders,
    inProgressOrders,
    newOrders,
  };
};
