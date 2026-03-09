import { useMemo } from 'react';
import type { Order } from '../types';

interface AgentHistoryProps {
  orders: Order[];
}

const CURRENCY_SYMBOL = '\u20B9';

const formatDeliveredDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown';
  }

  return parsedDate.toLocaleString();
};

export default function AgentHistory({ orders }: AgentHistoryProps) {
  const deliveredOrders = useMemo(
    () => orders
      .filter(order => order.status === 'Delivered')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders],
  );

  if (deliveredOrders.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink-muted">
        No delivered orders in history.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-black">History</h2>

      {deliveredOrders.map(order => (
        <article
          key={order.doc_id}
          className="rounded-3xl border border-white/10 bg-white/5 p-4"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Order ID</p>
              <p className="font-black">#{order.id}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Customer Name</p>
              <p className="font-black">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Total Amount</p>
              <p className="font-black text-primary">{CURRENCY_SYMBOL}{order.total_amount}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Delivered Date</p>
              <p className="font-bold">{formatDeliveredDate(order.delivery_assigned_at || order.created_at)}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
