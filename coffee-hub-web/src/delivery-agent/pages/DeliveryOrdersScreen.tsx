import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  MapPin,
  Package2,
  Phone,
  Route,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Order } from '../../types';
import { formatDateTime } from '../utils/formatTime';
import {
  buildMapsSearchUrl,
  formatCurrencyAmount,
  getOrderItemsSummary,
  normalizePhoneForTel,
} from '../utils/orderHelpers';

type DeliveryOrdersTabId = 'completed' | 'in-progress' | 'new';

type DeliveryOrdersTabMeta = {
  badgeClassName: string;
  buttonClassName: string;
  description: string;
  emptyMessage: string;
  emptyTitle: string;
  icon: LucideIcon;
  id: DeliveryOrdersTabId;
  label: string;
  statusLabel: string;
};

const DELIVERY_TAB_META: Record<DeliveryOrdersTabId, DeliveryOrdersTabMeta> = {
  new: {
    badgeClassName: 'border-amber-300/28 bg-amber-500/14 text-amber-200',
    buttonClassName: 'bg-[linear-gradient(135deg,#f6ad27,#f97316)] text-white shadow-[0_16px_30px_rgba(249,115,22,0.28)]',
    description: 'Fresh assignments waiting for pickup.',
    emptyMessage: 'Stay online and new dispatches will appear here.',
    emptyTitle: 'No new orders',
    icon: Truck,
    id: 'new',
    label: 'New',
    statusLabel: 'New',
  },
  'in-progress': {
    badgeClassName: 'border-sky-300/28 bg-sky-500/14 text-sky-200',
    buttonClassName: 'bg-[linear-gradient(135deg,#38bdf8,#2563eb)] text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]',
    description: 'Deliveries currently on the road.',
    emptyMessage: 'Start a delivery and it will move into this lane.',
    emptyTitle: 'No deliveries in progress',
    icon: Route,
    id: 'in-progress',
    label: 'In Progress',
    statusLabel: 'In Progress',
  },
  completed: {
    badgeClassName: 'border-emerald-300/28 bg-emerald-500/14 text-emerald-200',
    buttonClassName: '',
    description: 'Completed drops from your latest run.',
    emptyMessage: 'Delivered orders will show up here once you finish them.',
    emptyTitle: 'No completed deliveries',
    icon: CheckCircle2,
    id: 'completed',
    label: 'Completed',
    statusLabel: 'Delivered',
  },
};

type DeliveryOrderCardProps = {
  onMarkDelivered: (orderDocId: string) => void;
  onStartDelivery: (orderDocId: string) => void;
  order: Order;
  tabId: DeliveryOrdersTabId;
};

const DeliveryOrderCard = memo(function DeliveryOrderCard({
  onMarkDelivered,
  onStartDelivery,
  order,
  tabId,
}: DeliveryOrderCardProps) {
  const tabMeta = DELIVERY_TAB_META[tabId];
  const mapLink = buildMapsSearchUrl(order.address || order.customer_name || order.id);
  const hasPhone = Boolean(order.phone.trim());

  return (
    <motion.article
      layout
      whileTap={{ scale: 0.988 }}
      className="coffee-surface-soft rounded-[28px] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Order ID
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            #{order.id}
          </p>
        </div>

        <div className="text-right">
          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tabMeta.badgeClassName}`}>
            {tabMeta.statusLabel}
          </span>
          <p className="mt-2 text-sm font-semibold text-accent">
            {formatCurrencyAmount(order.final_total ?? order.total_amount)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Customer
          </p>
          <p className="mt-1 truncate text-base font-semibold text-ink">
            {order.customer_name || 'Unknown customer'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Updated {formatDateTime(order.updated_at || order.created_at)}
          </p>
        </div>

        {hasPhone ? (
          <a
            href={`tel:${normalizePhoneForTel(order.phone)}`}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-secondary/25 bg-secondary/10 px-3 text-sm font-semibold text-secondary transition hover:bg-secondary/15 hover:text-accent active:scale-[0.98]"
          >
            <Phone size={15} />
            <span>{order.phone}</span>
          </a>
        ) : (
          <div className="coffee-badge min-h-10 shrink-0 gap-2 px-3 text-sm font-semibold">
            <Phone size={15} />
            <span>No phone</span>
          </div>
        )}
      </div>

      <div className="app-muted-panel mt-4 rounded-[22px] p-3">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 shrink-0 text-secondary" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Address
            </p>
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 line-clamp-2 text-sm leading-6 text-ink hover:text-accent"
            >
              {order.address || 'Address not available'}
            </a>
          </div>
        </div>
      </div>

      <div className="app-muted-panel mt-4 rounded-[22px] px-3 py-3">
        <div className="flex items-center gap-2">
          <Package2 size={15} className="text-secondary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Items Summary
          </p>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
          {getOrderItemsSummary(order)}
        </p>
      </div>

      {tabId !== 'completed' && (
        <button
          type="button"
          onClick={() => {
            if (tabId === 'new') {
              onStartDelivery(order.doc_id);
              return;
            }

            onMarkDelivered(order.doc_id);
          }}
          className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[22px] px-4 text-sm font-semibold transition active:scale-[0.985] ${tabMeta.buttonClassName}`}
        >
          {tabId === 'new' ? <Clock3 size={17} /> : <CheckCircle2 size={17} />}
          <span>{tabId === 'new' ? 'Start Delivery' : 'Mark Delivered'}</span>
        </button>
      )}
    </motion.article>
  );
});

const DeliveryOrdersEmptyState = memo(function DeliveryOrdersEmptyState({
  tabId,
}: {
  tabId: DeliveryOrdersTabId;
}) {
  const tabMeta = DELIVERY_TAB_META[tabId];
  const Icon = tabMeta.icon;

  return (
    <div className="coffee-surface-soft flex min-h-[260px] flex-col items-center justify-center rounded-[30px] px-6 py-8 text-center">
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${tabMeta.badgeClassName}`}>
        <Icon size={26} />
      </div>
      <p className="mt-5 text-[1.25rem] font-semibold text-accent">{tabMeta.emptyTitle}</p>
      <p className="mt-2 max-w-72 text-sm leading-6 text-ink-muted">
        {tabMeta.emptyMessage}
      </p>
    </div>
  );
});

const DeliveryOrdersSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="coffee-surface-soft overflow-hidden rounded-[28px] p-4">
        <div className="coffee-skeleton h-5 w-24 rounded-full" />
        <div className="mt-4 coffee-skeleton h-6 w-40 rounded-full" />
        <div className="mt-4 coffee-skeleton h-[72px] w-full rounded-[22px]" />
        <div className="mt-3 coffee-skeleton h-16 w-full rounded-[22px]" />
        <div className="mt-4 coffee-skeleton h-12 w-full rounded-[22px]" />
      </div>
    ))}
  </div>
);

export type DeliveryOrdersScreenProps = {
  completedOrders: Order[];
  inProgressOrders: Order[];
  isLoading?: boolean;
  newOrders: Order[];
  ordersError?: string;
  onMarkDelivered: (orderDocId: string) => void;
  onStartDelivery: (orderDocId: string) => void;
};

export const DeliveryOrdersScreen = ({
  completedOrders,
  inProgressOrders,
  isLoading = false,
  newOrders,
  ordersError = '',
  onMarkDelivered,
  onStartDelivery,
}: DeliveryOrdersScreenProps) => {
  const sections = useMemo(
    () => ({
      completed: completedOrders,
      'in-progress': inProgressOrders,
      new: newOrders,
    }),
    [completedOrders, inProgressOrders, newOrders],
  );

  const [activeTab, setActiveTab] = useState<DeliveryOrdersTabId>(() => {
    if (inProgressOrders.length > 0) {
      return 'in-progress';
    }

    if (newOrders.length > 0) {
      return 'new';
    }

    return 'completed';
  });

  useEffect(() => {
    if (sections[activeTab].length > 0) {
      return;
    }

    const fallbackTab = (['in-progress', 'new', 'completed'] as DeliveryOrdersTabId[]).find(
      tabId => sections[tabId].length > 0,
    );

    if (fallbackTab) {
      setActiveTab(fallbackTab);
    }
  }, [activeTab, sections]);

  const activeOrders = sections[activeTab];
  const activeTabMeta = DELIVERY_TAB_META[activeTab];

  return (
    <section className="space-y-4">
      <div className="coffee-surface-soft rounded-[28px] p-3">
        <div className="app-muted-panel grid grid-cols-3 gap-2 rounded-[22px] p-1.5">
          {(Object.keys(DELIVERY_TAB_META) as DeliveryOrdersTabId[]).map(tabId => {
            const tabMeta = DELIVERY_TAB_META[tabId];
            const isActive = tabId === activeTab;

            return (
              <button
                key={tabMeta.id}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={`relative flex min-h-12 flex-col items-center justify-center rounded-[18px] px-2 text-center transition ${
                  isActive ? 'text-accent' : 'text-ink-muted'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="delivery-orders-tab"
                    className="absolute inset-0 rounded-[18px] border border-[var(--app-soft-panel-border)] bg-[var(--app-tab-active-background)] shadow-[0_14px_26px_rgba(0,0,0,0.16)]"
                  />
                )}
                <span className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.14em]">
                  {tabMeta.label}
                </span>
                <span className="relative z-10 mt-1 text-sm font-semibold">
                  {sections[tabId].length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-semibold text-accent">
              {activeTabMeta.label}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {activeTabMeta.description}
            </p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${activeTabMeta.badgeClassName}`}>
            {activeOrders.length}
          </span>
        </div>
      </div>

      {ordersError ? (
        <div className="rounded-[24px] border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {ordersError}
        </div>
      ) : null}

      {isLoading ? (
        <DeliveryOrdersSkeleton />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="space-y-3"
          >
            {activeOrders.length === 0 ? (
              <DeliveryOrdersEmptyState tabId={activeTab} />
            ) : (
              activeOrders.map(order => (
                <DeliveryOrderCard
                  key={order.doc_id}
                  onMarkDelivered={onMarkDelivered}
                  onStartDelivery={onStartDelivery}
                  order={order}
                  tabId={activeTab}
                />
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
};

export default DeliveryOrdersScreen;
