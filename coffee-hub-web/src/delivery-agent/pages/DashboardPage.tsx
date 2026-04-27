import { ClipboardList, UserCircle2 } from 'lucide-react';
import { useState } from 'react';
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
  isProfileOpen: boolean;
  newOrders: Order[];
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
  isProfileOpen,
  newOrders,
  onAvailabilityChange,
  onEndDelivery,
  onProfileToggle,
  onStartDelivery,
}: DashboardPageProps) => {
  const [activeView, setActiveView] = useState<'orders'>('orders');

  if (!isAuthorized) {
    return (
      <div className="px-4 pb-24 pt-24 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink-muted">
          Unauthorized Access
        </div>
      </div>
    );
  }

  const content = isProfileOpen
    ? (
      <ProfilePage
        deliveryAgent={deliveryAgent}
        isAvailabilitySaving={isAvailabilitySaving}
        onAvailabilityChange={onAvailabilityChange}
      />
    )
    : (
      <DeliveryOrdersScreen
        completedOrders={completedOrders}
        inProgressOrders={inProgressOrders}
        newOrders={newOrders}
        onMarkDelivered={orderDocId => {
          void onEndDelivery(orderDocId);
        }}
        onStartDelivery={orderDocId => {
          void onStartDelivery(orderDocId);
        }}
      />
    );

  return (
    <div className="px-4 pb-28 pt-24 sm:px-6">
      <div className="mb-4 flex items-center justify-between rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] px-4 py-3 text-[#fff8f2]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f0b173]">Delivery Panel</p>
          <h1 className="mt-1 text-xl font-semibold">{isProfileOpen ? 'Profile' : 'Orders'}</h1>
        </div>
        <button
          type="button"
          onClick={onProfileToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5ede3]"
          aria-label={isProfileOpen ? 'Show orders' : 'Open profile'}
        >
          {isProfileOpen ? <ClipboardList size={18} /> : <UserCircle2 size={18} />}
        </button>
      </div>

      {content}

      <DeliveryNavbar
        activeView={activeView}
        items={[{ id: 'orders', label: 'Orders', icon: ClipboardList }]}
        onChange={nextView => setActiveView(nextView)}
      />
    </div>
  );
};

export default DashboardPage;
