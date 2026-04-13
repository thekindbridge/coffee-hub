import { OrdersPage } from '../../../delivery-agent/pages/OrdersPage';
import type { Order } from '../../../types';

interface AgentHistoryProps {
  orders: Order[];
}

export default function AgentHistory({ orders }: AgentHistoryProps) {
  return <OrdersPage initialFilter="completed" orders={orders} />;
}
