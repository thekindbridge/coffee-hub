import { useMemo } from 'react';
import type { Order } from '../types';

const CURRENCY_SYMBOL = '\u20B9';

interface AdminOrdersProps {
  orders: Order[];
  newOrderDocIds: string[];
  orderStatuses: Order['status'][];
  onUpdateStatus: (orderDocId: string, status: Order['status']) => void;
}

const STATUS_BADGE_CLASS: Record<Order['status'], string> = {
  Pending: 'border border-amber-300/30 bg-amber-400/20 text-amber-300',
  Preparing: 'border border-sky-300/30 bg-sky-400/20 text-sky-300',
  'Out for Delivery': 'border border-orange-300/30 bg-orange-400/20 text-orange-300',
  Delivered: 'border border-emerald-300/30 bg-emerald-400/20 text-emerald-300',
};

export default function AdminOrders({
  orders,
  orderStatuses,
  onUpdateStatus,
}: AdminOrdersProps) {
  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders],
  );

  if (sortedOrders.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink-muted">
        No orders yet.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-black">Orders</h2>

      {sortedOrders.map(order => (
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
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Customer</p>
              <p className="font-black">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Total Amount</p>
              <p className="font-black text-primary">{CURRENCY_SYMBOL}{order.total_amount}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Current Status</p>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS_BADGE_CLASS[order.status]}`}>
                {order.status}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              Change Status
            </label>
            <select
              value={order.status}
              onChange={event => onUpdateStatus(order.doc_id, event.target.value as Order['status'])}
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-bold focus:border-primary focus:outline-none"
            >
              {orderStatuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </article>
      ))}
    </section>
  );
}
