import type { Order } from '../../types';
import { OrderCard } from './OrderCard';

export interface OrderListProps {
  emptyMessage: string;
  getTimestampValue: (order: Order) => string;
  orders: Order[];
  showAddress?: boolean;
  timestampLabel: string;
}

export const OrderList = ({
  emptyMessage,
  getTimestampValue,
  orders,
  showAddress = false,
  timestampLabel,
}: OrderListProps) => {
  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <div key={order.doc_id}>
          <OrderCard
            order={order}
            showAddress={showAddress}
            timestampLabel={timestampLabel}
            timestampValue={getTimestampValue(order)}
          />
        </div>
      ))}
    </div>
  );
};
