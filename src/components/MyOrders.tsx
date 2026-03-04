import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Clock3, PackageSearch } from 'lucide-react';
import type { Order } from '../types';

interface MyOrdersProps {
  orders: Order[];
  isLoading: boolean;
  onBrowseMenu: () => void;
}

const ORDER_FLOW: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

const STATUS_BADGE_CLASS: Record<Order['status'], string> = {
  Placed: 'border border-white/20 bg-white/10 text-ink-muted',
  Preparing: 'border border-amber-400/30 bg-amber-400/15 text-amber-300',
  'Out for Delivery': 'border border-sky-400/30 bg-sky-400/15 text-sky-300',
  Delivered: 'border border-emerald-400/30 bg-emerald-400/15 text-emerald-300',
};

const formatOrderDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown date';
  }

  return parsedDate.toLocaleString();
};

export default function MyOrders({ orders, isLoading, onBrowseMenu }: MyOrdersProps) {
  const [expandedOrderDocId, setExpandedOrderDocId] = useState('');

  const { activeOrders, pastOrders } = useMemo(() => {
    const active: Order[] = [];
    const past: Order[] = [];

    orders.forEach(order => {
      if (order.status === 'Delivered') {
        past.push(order);
      } else {
        active.push(order);
      }
    });

    return { activeOrders: active, pastOrders: past };
  }, [orders]);

  const toggleOrderDetails = (orderDocId: string) => {
    setExpandedOrderDocId(prev => (prev === orderDocId ? '' : orderDocId));
  };

  const renderProgressTracker = (status: Order['status']) => {
    const currentStatusIndex = ORDER_FLOW.indexOf(status);

    return (
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ORDER_FLOW.map((step, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;

          return (
            <div
              key={step}
              className={`rounded-xl border px-3 py-2 text-center text-[11px] font-bold ${
                isCompleted
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-white/10 bg-white/5 text-ink-muted'
              } ${isCurrent ? 'shadow-lg shadow-primary/20' : ''}`}
            >
              <span className="mr-1">{isCompleted ? 'Done' : index + 1}</span>
              {step}
            </div>
          );
        })}
      </div>
    );
  };

  const renderOrderCard = (order: Order, showTracker: boolean) => {
    const isExpanded = expandedOrderDocId === order.doc_id;
    const hasItems = Boolean(order.items && order.items.length > 0);

    return (
      <article key={order.doc_id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Order ID</p>
            <h3 className="text-xl font-black text-accent">#{order.id}</h3>
            <p className="mt-1 text-xs text-ink-muted">{formatOrderDate(order.created_at)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_BADGE_CLASS[order.status]}`}>
            {order.status}
          </span>
        </div>

        <div className="space-y-1 text-sm text-ink-muted">
          {hasItems ? (
            order.items!.slice(0, 2).map(item => (
              <p key={item.id}>
                {item.name} x{item.quantity}
              </p>
            ))
          ) : (
            <p>Items loading...</p>
          )}
          {hasItems && order.items!.length > 2 && (
            <p className="text-xs text-ink-muted">+{order.items!.length - 2} more items</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-sm text-ink-muted">Total</p>
          <p className="text-lg font-black text-primary">₹{order.total_amount}</p>
        </div>

        {showTracker && renderProgressTracker(order.status)}

        <button
          onClick={() => toggleOrderDetails(order.doc_id)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-muted transition-colors hover:bg-white/10"
        >
          {isExpanded ? 'Hide Details' : 'View Details'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isExpanded && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">Order Details</p>
            <div className="space-y-2 text-sm">
              {hasItems ? (
                order.items!.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <span className="text-ink-muted">
                      {item.name} x{item.quantity}
                    </span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))
              ) : (
                <p className="text-ink-muted">No item details found for this order.</p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm font-black">
              <span>Total</span>
              <span className="text-primary">₹{order.total_amount}</span>
            </div>
          </div>
        )}
      </article>
    );
  };

  if (isLoading) {
    return (
      <div className="pt-24 pb-24 px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <Clock3 className="mx-auto mb-3 text-ink-muted" size={28} />
          <p className="text-sm text-ink-muted">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="pt-24 pb-24 px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <PackageSearch className="mx-auto mb-4 text-ink-muted opacity-80" size={36} />
          <h2 className="mb-2 text-2xl font-black">No orders yet</h2>
          <p className="mb-6 text-sm text-ink-muted">Place your first order and track it live here.</p>
          <button
            onClick={onBrowseMenu}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-24 px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">Active Orders</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-ink-muted">
              {activeOrders.length}
            </span>
          </div>
          {activeOrders.length > 0 ? (
            <div className="space-y-4">
              {activeOrders.map(order => renderOrderCard(order, true))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-ink-muted">
              No active orders right now.
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">Past Orders</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-ink-muted">
              {pastOrders.length}
            </span>
          </div>
          {pastOrders.length > 0 ? (
            <div className="space-y-4">
              {pastOrders.map(order => renderOrderCard(order, false))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-ink-muted">
              Delivered orders will appear here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
