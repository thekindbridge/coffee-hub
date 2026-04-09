import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useOrderOperations } from '../../hooks/useOrderOperations';
import type { AuthState } from '../../hooks/useAuth';
import { useDeliveryOrders, type DeliveryOrdersState } from '../hooks/useDeliveryOrders';
import { useDeliveryStatus, type DeliveryStatusState } from '../hooks/useDeliveryStatus';

type DeliveryAgentContextValue = DeliveryOrdersState &
  DeliveryStatusState & {
    currentUserDisplayName: string;
    currentUserEmail: string;
    isDeliveryAgent: boolean;
    isEndingDelivery: boolean;
    isStartingDelivery: boolean;
    isUpdatingAvailability: boolean;
    normalizedCurrentEmail: string;
    updateAvailability: (isOnline: boolean) => Promise<void>;
    handleEndDelivery: (orderDocId?: string) => Promise<void>;
    handleStartDelivery: () => Promise<void>;
  };

const DeliveryAgentContext = createContext<DeliveryAgentContextValue | null>(null);

type DeliveryAgentProviderProps = PropsWithChildren<{
  auth: AuthState;
}>;

export function DeliveryAgentProvider({ auth, children }: DeliveryAgentProviderProps) {
  const isDeliveryAgent = auth.user?.role === 'agent';
  const ordersState = useDeliveryOrders({
    isAdmin: auth.user?.role === 'admin',
    isDeliveryAgent,
    normalizedCurrentEmail: auth.normalizedCurrentEmail,
  });
  const statusState = useDeliveryStatus(ordersState.currentDeliveryOrder);
  const operations = useOrderOperations({
    agentLastTrackedLocation: statusState.agentLastTrackedLocation,
    agentTrackerRef: statusState.agentTrackerRef,
    currentDeliveryAgent: ordersState.currentDeliveryAgent,
    currentDeliveryOrder: ordersState.currentDeliveryOrder,
    normalizedCurrentEmail: auth.normalizedCurrentEmail,
    setAgentLastTrackedLocation: statusState.setAgentLastTrackedLocation,
    setAgentPermissionState: statusState.setAgentPermissionState,
    setAgentTrackerStatus: statusState.setAgentTrackerStatus,
    setIsAgentTracking: statusState.setIsAgentTracking,
    trackedOrderIdRef: statusState.trackedOrderIdRef,
  });

  const value = useMemo<DeliveryAgentContextValue>(() => ({
    ...ordersState,
    ...statusState,
    ...operations,
    currentUserDisplayName: auth.user?.displayName || '',
    currentUserEmail: auth.currentUserEmail,
    isDeliveryAgent,
    normalizedCurrentEmail: auth.normalizedCurrentEmail,
  }), [
    auth.currentUserEmail,
    auth.normalizedCurrentEmail,
    auth.user?.displayName,
    isDeliveryAgent,
    operations,
    ordersState,
    statusState,
  ]);

  return (
    <DeliveryAgentContext.Provider value={value}>
      {children}
    </DeliveryAgentContext.Provider>
  );
}

export const useDeliveryAgentModule = () => {
  const value = useContext(DeliveryAgentContext);

  if (!value) {
    throw new Error('useDeliveryAgentModule must be used within DeliveryAgentProvider.');
  }

  return value;
};
