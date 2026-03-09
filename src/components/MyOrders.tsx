import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Clock3, PackageSearch } from 'lucide-react';

import type { Order } from '../types';

interface MyOrdersProps {
  orders: Order[];
  isLoading: boolean;
  onBrowseMenu: () => void;
}

const ORDER_FLOW: Order['status'][] = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
const CURRENCY_SYMBOL = '\u20B9';

const STATUS_BADGE_CLASS: Record<Order['status'], string> = {
  Pending: 'border border-white/12 bg-white/6 text-ink-muted',
  Preparing: 'border border-amber-400/30 bg-amber-400/14 text-amber-300',
  'Out for Delivery': 'border border-sky-400/30 bg-sky-400/14 text-sky-300',
  Delivered: 'border border-emerald-400/30 bg-emerald-400/14 text-emerald-300',
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

          return (
            <div
              key={step}
              className={`rounded-[18px] border px-3 py-2 text-center text-[11px] font-semibold ${
                isCompleted
                  ? 'border-secondary/30 bg-primary/18 text-accent'
                  : 'border-white/8 bg-white/5 text-ink-muted'
              }`}
            >
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
      <article key={order.doc_id} className="coffee-surface-soft rounded-[24px] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Order ID</p>
            <h3 className="mt-1 text-lg font-semibold text-accent">#{order.id}</h3>
            <p className="mt-1 text-xs text-ink-muted">{formatOrderDate(order.created_at)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASS[order.status]}`}>
            {order.status}
          </span>
        </div>

        <div className="mt-4 space-y-1 text-sm text-ink-muted">
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

        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
          <p className="text-sm text-ink-muted">Total</p>
          <p className="text-base font-semibold text-highlight">{CURRENCY_SYMBOL}{order.total_amount}</p>
        </div>

        {showTracker && renderProgressTracker(order.status)}

        <button
          onClick={() => toggleOrderDetails(order.doc_id)}
          className="coffee-btn-secondary mt-4 w-full justify-center"
        >
          {isExpanded ? 'Hide details' : 'View details'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isExpanded && (
          <div className="coffee-surface mt-4 rounded-[22px] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Order details</p>
            <div className="space-y-2 text-sm">
              {hasItems ? (
                order.items!.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <span className="text-ink-muted">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-accent">{CURRENCY_SYMBOL}{item.price * item.quantity}</span>
                  </div>
                ))
              ) : (
                <p className="text-ink-muted">No item details found for this order.</p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 text-sm font-semibold">
              <span>Total</span>
              <span className="text-highlight">{CURRENCY_SYMBOL}{order.total_amount}</span>
            </div>
          </div>
        )}
      </article>
    );
  };

  if (isLoading) {
    return (
      <div className="px-4 pb-28 pt-24 sm:px-6">
        <div className="coffee-surface-soft mx-auto max-w-screen-md rounded-[24px] p-6 text-center">
          <Clock3 className="mx-auto mb-3 text-ink-muted" size={28} />
          <p className="text-sm text-ink-muted">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="px-4 pb-28 pt-24 sm:px-6">
        <div className="coffee-surface-soft mx-auto max-w-screen-md rounded-[24px] p-8 text-center">
          <PackageSearch className="mx-auto mb-4 text-ink-muted opacity-80" size={36} />
          <h2 className="mb-2 text-[1.55rem] font-semibold text-accent">No orders yet</h2>
          <p className="mb-6 text-sm text-ink-muted">Place your first order and track it live here.</p>
          <button onClick={onBrowseMenu} className="coffee-btn-primary">
            Browse menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-28 pt-24 sm:px-6">
      <div className="mx-auto max-w-screen-md space-y-8">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Active orders</p>
              <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">In progress</h2>
            </div>
            <span className="coffee-badge">{activeOrders.length}</span>
          </div>
          {activeOrders.length > 0 ? (
            <div className="space-y-4">
              {activeOrders.map(order => renderOrderCard(order, true))}
            </div>
          ) : (
            <div className="coffee-surface-soft rounded-[22px] p-4 text-sm text-ink-muted">
              No active orders right now.
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Past orders</p>
              <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">Delivered</h2>
            </div>
            <span className="coffee-badge">{pastOrders.length}</span>
          </div>
          {pastOrders.length > 0 ? (
            <div className="space-y-4">
              {pastOrders.map(order => renderOrderCard(order, false))}
            </div>
          ) : (
            <div className="coffee-surface-soft rounded-[22px] p-4 text-sm text-ink-muted">
              Delivered orders will appear here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
