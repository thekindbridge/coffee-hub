import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Clock3, MapPin, PackageSearch } from 'lucide-react';

import type { Order } from '../types';
import { CancelOrderModal } from './CancelOrderModal';
import {
  getOrderStatusCustomerCopy,
  isCustomerCancellableOrderStatus,
  ORDER_STATUS_DISPLAY,
  ORDER_STATUS_PROGRESS_FLOW,
} from '../../shared/orderStatus';

interface MyOrdersProps {
  orders: Order[];
  isLoading: boolean;
  onBrowseMenu: () => void;
  onCancelOrder: (order: Order, cancellationReason: string) => Promise<void>;
  onTrackOrder: (order: Order) => void;
}

const ORDER_FLOW: Order['status'][] = ORDER_STATUS_PROGRESS_FLOW.map(
  statusCode => ORDER_STATUS_DISPLAY[statusCode],
);
const CURRENCY_SYMBOL = '\u20B9';

const STATUS_BADGE_CLASS: Record<Order['status'], string> = {
  Pending: 'border border-white/12 bg-white/6 text-ink-muted',
  Accepted: 'border border-emerald-400/30 bg-emerald-400/14 text-emerald-300',
  Preparing: 'border border-amber-400/30 bg-amber-400/14 text-amber-300',
  'Out for Delivery': 'border border-sky-400/30 bg-sky-400/14 text-sky-300',
  Delivered: 'border border-emerald-400/30 bg-emerald-400/14 text-emerald-300',
  Rejected: 'border border-rose-400/30 bg-rose-400/14 text-rose-300',
  Cancelled: 'border border-rose-400/30 bg-rose-500/14 text-rose-200',
};

const formatOrderDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown date';
  }

  return parsedDate.toLocaleString();
};

export default function MyOrders({
  orders,
  isLoading,
  onBrowseMenu,
  onCancelOrder,
  onTrackOrder,
}: MyOrdersProps) {
  const [expandedOrderDocId, setExpandedOrderDocId] = useState('');
  const [cancelTargetOrder, setCancelTargetOrder] = useState<Order | null>(null);
  const [cancellingOrderDocId, setCancellingOrderDocId] = useState('');
  const [cancelError, setCancelError] = useState('');

  const { activeOrders, pastOrders } = useMemo(() => {
    const active: Order[] = [];
    const past: Order[] = [];

    orders.forEach(order => {
      if (
        order.status_code === 'DELIVERED' ||
        order.status_code === 'REJECTED' ||
        order.status_code === 'CANCELLED'
      ) {
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

  const closeCancelModal = () => {
    if (cancellingOrderDocId) {
      return;
    }

    setCancelTargetOrder(null);
    setCancelError('');
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTargetOrder) {
      return;
    }

    setCancelError('');
    setCancellingOrderDocId(cancelTargetOrder.doc_id);

    try {
      await onCancelOrder(cancelTargetOrder, reason);
      setCancelTargetOrder(null);
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : 'Unable to cancel this order right now.',
      );
    } finally {
      setCancellingOrderDocId('');
    }
  };

  const renderProgressTracker = (status: Order['status']) => {
    const currentStatusIndex = ORDER_FLOW.indexOf(status);
    const progressPercent = currentStatusIndex <= 0
      ? 0
      : (currentStatusIndex / (ORDER_FLOW.length - 1)) * 100;

    return (
      <div className="mt-4 rounded-[30px] border border-white/10 bg-white/5 px-4 py-4">
        <div className="relative">
          <div className="absolute left-0 right-0 top-3 h-1.5 rounded-full bg-white/10" />
          <div
            className="absolute left-0 top-3 h-1.5 rounded-full bg-secondary"
            style={{ width: `${progressPercent}%` }}
          />
          <div className="grid grid-cols-4 gap-2">
            {ORDER_FLOW.map((step, index) => {
              const isReached = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <div key={step} className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full border ${
                      isReached
                        ? 'border-secondary bg-secondary'
                        : 'border-white/15 bg-[#1a1310]'
                    } ${isCurrent ? 'shadow-[0_0_0_4px_rgba(192,138,93,0.15)]' : ''}`}
                  />
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-[0.12em] leading-4 sm:text-[10px] ${
                      isCurrent ? 'text-accent' : isReached ? 'text-[#f5ede3]' : 'text-ink-muted'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderOrderCard = (order: Order, showTracker: boolean) => {
    const isExpanded = expandedOrderDocId === order.doc_id;
    const hasItems = Boolean(order.items && order.items.length > 0);
    const canTrackOrder =
      showTracker &&
      order.status_code !== 'REJECTED' &&
      order.status_code !== 'CANCELLED';
    const canCancelOrder = isCustomerCancellableOrderStatus(order.status_code);

    return (
      <article key={order.doc_id} className="coffee-surface-soft rounded-[24px] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Order ID</p>
            <h3 className="mt-1 text-lg font-semibold text-accent">#{order.id}</h3>
            <p className="mt-1 text-xs text-ink-muted">{formatOrderDate(order.created_at)}</p>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:min-w-[220px]">
            <span
              className={`min-w-[130px] whitespace-nowrap rounded-full px-3 py-1 text-center text-[11px] font-semibold ${STATUS_BADGE_CLASS[order.status]}`}
            >
              {order.status}
            </span>
            {canTrackOrder && (
              <button
                onClick={() => onTrackOrder(order)}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-ink-muted transition-colors hover:border-white/20 hover:text-accent"
              >
                <MapPin size={14} />
                Track
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-sm text-ink-muted">{getOrderStatusCustomerCopy(order.status_code)}</p>

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

        {canCancelOrder && (
          <button
            type="button"
            onClick={() => {
              setCancelError('');
              setCancelTargetOrder(order);
            }}
            disabled={cancellingOrderDocId === order.doc_id}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-rose-300/25 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/16 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancellingOrderDocId === order.doc_id ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}

        {canTrackOrder && renderProgressTracker(order.status)}

        {order.status_code === 'REJECTED' && order.rejection_reason && (
          <div className="mt-4 rounded-[20px] border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200">Rejection reason</p>
            <p className="mt-2 leading-6">{order.rejection_reason}</p>
          </div>
        )}

        {order.status_code === 'CANCELLED' && order.cancellation_reason && (
          <div className="mt-4 rounded-[20px] border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200">Cancellation reason</p>
            <p className="mt-2 leading-6">{order.cancellation_reason}</p>
          </div>
        )}

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
              <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">History</h2>
            </div>
            <span className="coffee-badge">{pastOrders.length}</span>
          </div>
          {pastOrders.length > 0 ? (
            <div className="space-y-4">
              {pastOrders.map(order => renderOrderCard(order, false))}
            </div>
          ) : (
            <div className="coffee-surface-soft rounded-[22px] p-4 text-sm text-ink-muted">
              Delivered, rejected, and cancelled orders will appear here.
            </div>
          )}
        </section>
      </div>

      <CancelOrderModal
        isOpen={Boolean(cancelTargetOrder)}
        orderId={cancelTargetOrder?.id || ''}
        isSubmitting={Boolean(cancellingOrderDocId)}
        submitError={cancelError}
        onClose={closeCancelModal}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
