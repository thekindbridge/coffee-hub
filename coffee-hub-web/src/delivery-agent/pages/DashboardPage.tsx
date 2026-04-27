import { CheckCircle2, Package, Power, Route } from 'lucide-react';
import { useMemo } from 'react';
import type { AgentStatus } from '../../features/app/types';
import type { DeliveryAgent, Order } from '../../types';
import { formatAgentAvailabilityLabel } from '../utils/orderHelpers';

export type DashboardPageProps = {
  completedOrders: Order[];
  deliveryAgent: DeliveryAgent | null;
  inProgressOrders: Order[];
  isAuthorized: boolean;
  isAvailabilitySaving?: boolean;
  newOrders: Order[];
  onAvailabilityChange?: (status: AgentStatus) => void | Promise<void>;
};

export const DashboardPage = ({
  completedOrders,
  deliveryAgent,
  inProgressOrders,
  isAuthorized,
  isAvailabilitySaving = false,
  newOrders,
  onAvailabilityChange,
}: DashboardPageProps) => {
  const todayCompletedCount = useMemo(() => {
    const now = new Date();

    return completedOrders.filter(order => {
      const completedAt = new Date(order.delivery_delivered_at || order.updated_at || order.created_at);
      return (
        completedAt.getDate() === now.getDate() &&
        completedAt.getMonth() === now.getMonth() &&
        completedAt.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [completedOrders]);

  if (!isAuthorized) {
    return (
      <div className="coffee-surface-soft rounded-[30px] p-6 text-center text-sm text-ink-muted">
        Delivery access is not enabled for this account.
      </div>
    );
  }

  const availabilityLabel = formatAgentAvailabilityLabel(deliveryAgent);
  const isAgentOnline = availabilityLabel === 'Online';
  const dashboardCards = [
    {
      icon: Package,
      label: 'Active',
      toneClassName: 'border-amber-300/22 bg-amber-500/12 text-amber-200',
      value: newOrders.length + inProgressOrders.length,
    },
    {
      icon: Route,
      label: 'In Progress',
      toneClassName: 'border-sky-300/22 bg-sky-500/12 text-sky-200',
      value: inProgressOrders.length,
    },
    {
      icon: CheckCircle2,
      label: 'Completed',
      toneClassName: 'border-emerald-300/22 bg-emerald-500/12 text-emerald-200',
      value: todayCompletedCount,
    },
  ] as const;

  return (
    <div className="space-y-4">
      <section className="coffee-surface overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
              Delivery Dashboard
            </p>
            <h2 className="mt-2 text-[1.5rem] font-semibold text-accent">
              Stay ready for the next run
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Keep availability visible, track your active loads, and move fast when new drops come in.
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              isAgentOnline
                ? 'border-emerald-400/28 bg-emerald-500/12 text-emerald-200'
                : 'border-rose-300/24 bg-rose-500/10 text-rose-200'
            }`}
          >
            {availabilityLabel}
          </span>
        </div>
      </section>

      <section className="coffee-surface-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Power size={16} className="text-secondary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
              Online / Offline
            </p>
          </div>

          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
              isAgentOnline
                ? 'border-emerald-400/28 bg-emerald-500/12 text-emerald-200'
                : 'border-rose-300/24 bg-rose-500/10 text-rose-200'
            }`}
          >
            {availabilityLabel}
          </span>
        </div>

        <p className="mt-2 text-sm text-ink-muted">
          Toggle availability when you are ready to receive deliveries.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {([
            {
              helper: 'Receive new delivery requests',
              label: 'Go Online',
              status: 'Available',
            },
            {
              helper: 'Pause incoming assignments',
              label: 'Go Offline',
              status: 'Offline',
            },
          ] as const).map(option => {
            const isActive = isAgentOnline === (option.status === 'Available');

            return (
              <button
                key={option.status}
                type="button"
                onClick={() => {
                  void onAvailabilityChange?.(option.status);
                }}
                disabled={isAvailabilitySaving || isActive}
                className={`rounded-[22px] border px-4 py-3.5 text-left transition active:scale-[0.985] ${
                  isActive
                    ? option.status === 'Available'
                      ? 'border-emerald-400/30 bg-emerald-500/14 text-emerald-200'
                      : 'border border-white/12 bg-white/8 text-accent'
                    : 'border-[var(--app-soft-panel-border)] bg-[var(--app-soft-panel-background)] text-ink hover:bg-[var(--app-soft-panel-hover)]'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <p className="text-sm font-semibold">
                  {isAvailabilitySaving && isActive ? 'Saving...' : option.label}
                </p>
                <p className={`mt-1 text-xs ${isActive ? 'text-current/80' : 'text-ink-muted'}`}>
                  {option.helper}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {dashboardCards.map(card => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="coffee-surface-soft min-w-0 p-3"
            >
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border ${card.toneClassName}`}>
                <Icon size={17} />
              </div>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {card.label}
              </p>
              <p className="mt-1 truncate text-[1.35rem] font-semibold text-ink">
                {card.value}
              </p>
            </article>
          );
        })}
      </section>

      <section className="app-muted-panel rounded-[26px] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
          Today&apos;s Focus
        </p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Stay online during active hours so new dispatches flow straight into the Orders tab.
        </p>
      </section>
    </div>
  );
};

export default DashboardPage;
