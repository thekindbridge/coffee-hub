import { DeliveryOrdersScreen } from '../../../delivery-agent/pages/DeliveryOrdersScreen';
import type { Order } from '../../../types';

interface AgentHistoryProps {
  orders: Order[];
}

export default function AgentHistory({ orders }: AgentHistoryProps) {
  return (
    <DeliveryOrdersScreen
      completedOrders={orders}
      inProgressOrders={[]}
      newOrders={[]}
      onMarkDelivered={() => undefined}
      onStartDelivery={() => undefined}
    />
  );
}
