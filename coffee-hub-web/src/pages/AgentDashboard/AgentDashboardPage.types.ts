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

export type AgentDashboardPageProps = {
  activeOrder: Order | null;
  deliveryAgent: DeliveryAgent | null;
  deliverySession: DeliverySession | null;
  isAuthorized: boolean;
  isTracking: boolean;
  lastTrackedLocation: DeliveryLocation | null;
  orders: Order[];
  permissionState: AgentTrackerPermissionState;
  trackerStatus: AgentTrackerStatus;
  onEndDelivery: (orderDocId: string) => void | Promise<void>;
  onStartDelivery: () => void | Promise<void>;
};
