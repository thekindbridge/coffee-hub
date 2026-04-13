import type { Order } from '../../types';
import { formatCurrencyAmount, getOrderAmount } from '../utils/orderHelpers';

export interface OrderCardProps {
  order: Order;
  showAddress?: boolean;
  timestampLabel: string;
  timestampValue: string;
}

export const OrderCard = ({
  order,
  showAddress = false,
  timestampLabel,
  timestampValue,
}: OrderCardProps) => (
  <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Order ID</p>
        <p className="mt-1 text-lg font-black text-ink">#{order.id}</p>
      </div>
      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
        {order.status}
      </div>
    </div>

    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Customer</p>
        <p className="mt-1 font-semibold text-ink">{order.customer_name}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Total Amount</p>
        <p className="mt-1 font-semibold text-primary">{formatCurrencyAmount(getOrderAmount(order))}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{timestampLabel}</p>
        <p className="mt-1 font-semibold text-ink">{timestampValue}</p>
      </div>
    </div>

    {showAddress && (
      <div className="mt-4 rounded-[22px] border border-white/10 bg-background/50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Address</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{order.address}</p>
      </div>
    )}
  </article>
);
