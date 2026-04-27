import { CheckCircle2, Clock3, MapPin, Phone } from 'lucide-react';
import type { Order } from '../../types';
import { formatDateTime } from '../utils/formatTime';
import { getOrderItemsSummary, normalizePhoneForTel } from '../utils/orderHelpers';

type DeliveryOrdersSectionProps = {
  emptyMessage: string;
  onMarkDelivered: (orderDocId: string) => void;
  onStartDelivery: (orderDocId: string) => void;
  orders: Order[];
  title: string;
  type: 'completed' | 'in-progress' | 'new';
};

const DeliveryOrdersSection = ({
  emptyMessage,
  onMarkDelivered,
  onStartDelivery,
  orders,
  title,
  type,
}: DeliveryOrdersSectionProps) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f0b173]">
        {title}
      </h2>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
        {orders.length}
      </span>
    </div>

    {orders.length === 0 ? (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-ink-muted">
        {emptyMessage}
      </div>
    ) : (
      <div className="space-y-3">
        {orders.map(order => (
          <article key={order.doc_id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Order ID</p>
                <p className="mt-1 text-lg font-semibold text-ink">#{order.id}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f5ede3]">
                {order.status_code}
              </span>
            </div>

            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Customer</p>
                <p className="mt-1 font-semibold text-ink">{order.customer_name || 'Unknown customer'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Phone</p>
                <a href={`tel:${normalizePhoneForTel(order.phone)}`} className="mt-1 inline-flex items-center gap-1.5 font-semibold text-secondary hover:text-accent">
                  <Phone size={14} />
                  {order.phone || 'Not available'}
                </a>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-background/40 p-3 text-sm">
              <div className="flex items-start gap-2 text-ink-muted">
                <MapPin size={14} className="mt-0.5 text-secondary" />
                <p className="leading-6">{order.address || 'Address not available'}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Items</p>
              <p className="mt-1 text-sm text-ink-muted">{getOrderItemsSummary(order)}</p>
            </div>

            <p className="mt-3 text-xs text-ink-muted">
              Updated {formatDateTime(order.updated_at || order.created_at)}
            </p>

            {type !== 'completed' && (
              <div className="mt-3">
                {type === 'new' ? (
                  <button
                    type="button"
                    onClick={() => onStartDelivery(order.doc_id)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#f97316] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#ea6a10]"
                  >
                    <Clock3 size={16} />
                    Start Delivery
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMarkDelivered(order.doc_id)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-[#fff8f2]"
                  >
                    <CheckCircle2 size={16} />
                    Mark Delivered
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    )}
  </section>
);

export type DeliveryOrdersScreenProps = {
  completedOrders: Order[];
  inProgressOrders: Order[];
  newOrders: Order[];
  onMarkDelivered: (orderDocId: string) => void;
  onStartDelivery: (orderDocId: string) => void;
};

export const DeliveryOrdersScreen = ({
  completedOrders,
  inProgressOrders,
  newOrders,
  onMarkDelivered,
  onStartDelivery,
}: DeliveryOrdersScreenProps) => (
  <div className="space-y-5">
    <DeliveryOrdersSection
      emptyMessage="No new delivery assignments right now."
      onMarkDelivered={onMarkDelivered}
      onStartDelivery={onStartDelivery}
      orders={newOrders}
      title="New Orders"
      type="new"
    />

    <DeliveryOrdersSection
      emptyMessage="No deliveries are currently in progress."
      onMarkDelivered={onMarkDelivered}
      onStartDelivery={onStartDelivery}
      orders={inProgressOrders}
      title="In Progress"
      type="in-progress"
    />

    <DeliveryOrdersSection
      emptyMessage="No completed deliveries yet."
      onMarkDelivered={onMarkDelivered}
      onStartDelivery={onStartDelivery}
      orders={completedOrders}
      title="Completed"
      type="completed"
    />
  </div>
);

export default DeliveryOrdersScreen;
