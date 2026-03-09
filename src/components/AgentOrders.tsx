import { useMemo } from 'react';
import type { Order } from '../types';

interface AgentOrdersProps {
  orders: Order[];
  onMarkDelivered: (orderDocId: string) => void;
}

const CURRENCY_SYMBOL = '\u20B9';

const STATUS_BADGE_CLASS: Record<Order['status'], string> = {
  Pending: 'border border-amber-300/30 bg-amber-400/20 text-amber-300',
  Preparing: 'border border-sky-300/30 bg-sky-400/20 text-sky-300',
  'Out for Delivery': 'border border-orange-300/30 bg-orange-400/20 text-orange-300',
  Delivered: 'border border-emerald-300/30 bg-emerald-400/20 text-emerald-300',
};

const buildMapsSearchUrl = (address: string) => (
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
);

const normalizePhoneForTel = (phone: string) => phone.replace(/\s+/g, '');

export default function AgentOrders({ orders, onMarkDelivered }: AgentOrdersProps) {
  const activeOrders = useMemo(
    () => orders
      .filter(order => order.status === 'Out for Delivery')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders],
  );

  if (activeOrders.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink-muted">
        No active delivery orders.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-black">Active Orders</h2>

      {activeOrders.map(order => (
        <article
          key={order.doc_id}
          className="rounded-3xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Order ID</p>
              <p className="text-lg font-black">#{order.id}</p>
            </div>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS_BADGE_CLASS[order.status]}`}>
              {order.status}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Customer Name</p>
              <p className="font-bold">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Phone Number</p>
              <p className="font-bold">{order.phone}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Full Address</p>
              <p>{order.address}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Items</p>
              {order.items && order.items.length > 0 ? (
                <ul className="space-y-1">
                  {order.items.map(item => (
                    <li key={item.id}>
                      {item.name} x{item.quantity}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-muted">Items loading...</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Total Amount</p>
                <p className="font-black text-primary">{CURRENCY_SYMBOL}{order.total_amount}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Payment Method</p>
                <p className="font-bold">{order.payment_method || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a
              href={`tel:${normalizePhoneForTel(order.phone)}`}
              className="flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black"
            >
              Call
            </a>
            <a
              href={buildMapsSearchUrl(order.address)}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black"
            >
              Navigate
            </a>
            <button
              onClick={() => onMarkDelivered(order.doc_id)}
              className="min-h-12 rounded-2xl bg-primary px-4 text-sm font-black text-white"
            >
              Mark Delivered
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
