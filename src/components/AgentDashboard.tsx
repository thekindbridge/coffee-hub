import { useState } from 'react';
import { Bike, History } from 'lucide-react';
import type {
  AgentTrackerPermissionState,
  AgentTrackerStatus,
} from '../agent/agentTracker';
import AgentDeliveryPage from '../agent/AgentDeliveryPage';
import type {
  DeliveryAgent,
  DeliveryLocation,
  DeliverySession,
  Order,
} from '../types';
import AgentHistory from './AgentHistory';

type AgentTab = 'active' | 'history';

interface AgentDashboardProps {
  isAuthorized: boolean;
  orders: Order[];
  activeOrder: Order | null;
  deliveryAgent: DeliveryAgent | null;
  deliverySession: DeliverySession | null;
  isTracking: boolean;
  lastTrackedLocation: DeliveryLocation | null;
  permissionState: AgentTrackerPermissionState;
  trackerStatus: AgentTrackerStatus;
  onStartDelivery: () => void | Promise<void>;
  onEndDelivery: (orderDocId: string) => void | Promise<void>;
}

export default function AgentDashboard({
  isAuthorized,
  orders,
  activeOrder,
  deliveryAgent,
  deliverySession,
  isTracking,
  lastTrackedLocation,
  permissionState,
  trackerStatus,
  onStartDelivery,
  onEndDelivery,
}: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState<AgentTab>('active');

  if (!isAuthorized) {
    return (
      <div className="px-4 pb-24 pt-24 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink-muted">
          Unauthorized Access
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-28 pt-24 sm:px-6">
      {activeTab === 'active' ? (
        <AgentDeliveryPage
          deliveryAgent={deliveryAgent}
          deliverySession={deliverySession}
          isTracking={isTracking}
          lastTrackedLocation={lastTrackedLocation}
          onEndDelivery={() => {
            if (!activeOrder) {
              return;
            }

            void onEndDelivery(activeOrder.doc_id);
          }}
          onStartDelivery={onStartDelivery}
          order={activeOrder}
          permissionState={permissionState}
          trackerStatus={trackerStatus}
        />
      ) : (
        <AgentHistory orders={orders} />
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t border-white/10 bg-background/95 px-2 py-2 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-[10px] font-black uppercase tracking-wide transition-colors ${
              activeTab === 'active'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-ink-muted'
            }`}
          >
            <Bike size={18} />
            <span className="mt-1">Active Orders</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-[10px] font-black uppercase tracking-wide transition-colors ${
              activeTab === 'history'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-ink-muted'
            }`}
          >
            <History size={18} />
            <span className="mt-1">History</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
