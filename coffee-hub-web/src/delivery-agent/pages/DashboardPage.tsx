import {
  Bike,
  ClipboardList,
  UserCircle2,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  AgentTrackerPermissionState,
  AgentTrackerStatus,
} from '../../agent/agentTracker';
import type {
  DeliveryAgent,
  DeliveryLocation,
  DeliverySession,
  Order,
} from '../../types';
import { DeliveryNavbar } from '../components/DeliveryNavbar';
import { EarningsSummary } from '../components/EarningsSummary';
import {
  DELIVERY_NAV_ITEMS,
  type DeliveryViewId,
} from '../constants/deliveryStatus';
import { buildDeliveryEarningsSummary } from '../utils/orderHelpers';
import { EarningsPage } from './EarningsPage';
import { OrderDetailsPage } from './OrderDetailsPage';
import { OrdersPage } from './OrdersPage';
import { ProfilePage } from './ProfilePage';

export type DashboardPageProps = {
  activeOrder: Order | null;
  deliveryAgent: DeliveryAgent | null;
  deliverySession: DeliverySession | null;
  isAuthorized: boolean;
  isTracking: boolean;
  lastTrackedLocation: DeliveryLocation | null;
  onEndDelivery: (orderDocId: string) => void | Promise<void>;
  onStartDelivery: () => void | Promise<void>;
  orders: Order[];
  permissionState: AgentTrackerPermissionState;
  trackerStatus: AgentTrackerStatus;
};

const DELIVERY_NAV_ICONS: Record<DeliveryViewId, LucideIcon> = {
  dashboard: Bike,
  earnings: Wallet,
  orders: ClipboardList,
  profile: UserCircle2,
};

export const DashboardPage = ({
  activeOrder,
  deliveryAgent,
  deliverySession,
  isAuthorized,
  isTracking,
  lastTrackedLocation,
  onEndDelivery,
  onStartDelivery,
  orders,
  permissionState,
  trackerStatus,
}: DashboardPageProps) => {
  const [activeView, setActiveView] = useState<DeliveryViewId>('dashboard');
  const earningsSummary = useMemo(() => buildDeliveryEarningsSummary(orders), [orders]);
  const deliveryNavItems = useMemo(
    () => DELIVERY_NAV_ITEMS.map(item => ({
      ...item,
      icon: DELIVERY_NAV_ICONS[item.id],
    })),
    [],
  );

  if (!isAuthorized) {
    return (
      <div className="px-4 pb-24 pt-24 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink-muted">
          Unauthorized Access
        </div>
      </div>
    );
  }

  let content = (
    <div className="space-y-4">
      <EarningsSummary summary={earningsSummary} />
      <OrderDetailsPage
        deliveryAgent={deliveryAgent}
        deliverySession={deliverySession}
        isTracking={isTracking}
        lastTrackedLocation={lastTrackedLocation}
        onEndDelivery={onEndDelivery}
        onStartDelivery={onStartDelivery}
        order={activeOrder}
        permissionState={permissionState}
        trackerStatus={trackerStatus}
      />
    </div>
  );

  if (activeView === 'orders') {
    content = <OrdersPage orders={orders} />;
  } else if (activeView === 'earnings') {
    content = <EarningsPage orders={orders} />;
  } else if (activeView === 'profile') {
    content = (
      <ProfilePage
        deliveryAgent={deliveryAgent}
        deliverySession={deliverySession}
        permissionState={permissionState}
        trackerStatus={trackerStatus}
      />
    );
  }

  return (
    <div className="px-4 pb-28 pt-24 sm:px-6">
      {content}

      <DeliveryNavbar
        activeView={activeView}
        items={deliveryNavItems}
        onChange={nextView => setActiveView(nextView)}
      />
    </div>
  );
};

export default DashboardPage;
