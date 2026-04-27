import { CheckCircle2, ClipboardList, Package, Route } from 'lucide-react';
import { useMemo } from 'react';
import type { AgentStatus } from '../../features/app/types';
import type { DeliveryAgent, Order } from '../../types';
import { DeliveryNavbar } from '../components/DeliveryNavbar';
import { DeliveryOrdersScreen } from './DeliveryOrdersScreen';
import { ProfilePage } from './ProfilePage';

export type DashboardPageProps = {
  completedOrders: Order[];
  deliveryAgent: DeliveryAgent | null;
  inProgressOrders: Order[];
  isAuthorized: boolean;
  isAvailabilitySaving?: boolean;
  isOrdersLoading?: boolean;
  isProfileOpen: boolean;
  newOrders: Order[];
  ordersError?: string;
  onAvailabilityChange?: (status: AgentStatus) => void | Promise<void>;
  onEndDelivery: (orderDocId: string) => void | Promise<void>;
  onProfileToggle: () => void;
  onStartDelivery: (orderDocId: string) => void | Promise<void>;
};

export const DashboardPage = ({
  completedOrders,
  deliveryAgent,
  inProgressOrders,
  isAuthorized,
  isAvailabilitySaving = false,
  isOrdersLoading = false,
  isProfileOpen,
  newOrders,
  ordersError = '',
  onAvailabilityChange,
  onEndDelivery,
  onProfileToggle,
  onStartDelivery,
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
      <div className="px-4 pb-24 pt-32 sm:px-6">
        <div className="coffee-surface-soft rounded-[30px] p-6 text-center text-sm text-ink-muted">
          Delivery access is not enabled for this account.
        </div>
      </div>
    );
  }

  const dashboardCards = [
    {
      accentClassName: 'border-amber-300/18 bg-amber-500/10 text-amber-100',
      icon: Package,
      iconClassName: 'bg-amber-400/18 text-amber-300',
      label: 'Active Orders',
      value: newOrders.length + inProgressOrders.length,
    },
    {
      accentClassName: 'border-sky-300/18 bg-sky-500/10 text-sky-100',
      icon: Route,
      iconClassName: 'bg-sky-400/18 text-sky-300',
      label: 'In Progress',
      value: inProgressOrders.length,
    },
    {
      accentClassName: 'border-emerald-300/18 bg-emerald-500/10 text-emerald-100',
      icon: CheckCircle2,
      iconClassName: 'bg-emerald-400/18 text-emerald-300',
      label: 'Completed Today',
      value: todayCompletedCount,
    },
  ] as const;

  const content = isProfileOpen ? (
    <ProfilePage
      deliveryAgent={deliveryAgent}
      isAvailabilitySaving={isAvailabilitySaving}
      onAvailabilityChange={onAvailabilityChange}
    />
  ) : (
    <div className="space-y-4">
      <section className="grid grid-cols-3 gap-3">
        {dashboardCards.map(card => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className={`rounded-[24px] border px-3 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.16)] ${card.accentClassName}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${card.iconClassName}`}>
                <Icon size={18} />
              </div>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                {card.label}
              </p>
              <p className="mt-1 text-[1.3rem] font-semibold text-white">
                {card.value}
              </p>
            </article>
          );
        })}
      </section>

      <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(30,22,18,0.94),rgba(16,11,10,0.94))] px-4 py-3 shadow-[0_18px_38px_rgba(0,0,0,0.2)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
          Delivery Workflow
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Scan new drops, start fast, and close active deliveries with one tap.
        </p>
      </div>

      <DeliveryOrdersScreen
        completedOrders={completedOrders}
        inProgressOrders={inProgressOrders}
        isLoading={isOrdersLoading}
        newOrders={newOrders}
        ordersError={ordersError}
        onMarkDelivered={orderDocId => {
          void onEndDelivery(orderDocId);
        }}
        onStartDelivery={orderDocId => {
          void onStartDelivery(orderDocId);
        }}
      />
    </div>
  );

  return (
    <div className="px-4 pb-28 pt-32 sm:px-6">
      {content}

      <DeliveryNavbar
        activeView="orders"
        items={[{ id: 'orders', label: 'Orders', icon: ClipboardList }]}
        onChange={() => {
          if (isProfileOpen) {
            onProfileToggle();
          }
        }}
      />
    </div>
  );
};

export default DashboardPage;
