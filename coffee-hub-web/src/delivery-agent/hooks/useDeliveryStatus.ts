import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import {
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../../agent/agentTracker';
import { normalizeStatus } from '../../../shared/orderStatus';
import { DEFAULT_TRACKER_STATUS } from '../../features/app/lib/constants';
import type { DeliveryLocation, Order } from '../../types';

export type DeliveryStatusState = {
  agentLastTrackedLocation: DeliveryLocation | null;
  agentPermissionState: AgentTrackerPermissionState;
  agentTrackerRef: MutableRefObject<ReturnType<typeof createAgentTracker> | null>;
  agentTrackerStatus: AgentTrackerStatus;
  isAgentTracking: boolean;
  setAgentLastTrackedLocation: Dispatch<SetStateAction<DeliveryLocation | null>>;
  setAgentPermissionState: Dispatch<SetStateAction<AgentTrackerPermissionState>>;
  setAgentTrackerStatus: Dispatch<SetStateAction<AgentTrackerStatus>>;
  setIsAgentTracking: Dispatch<SetStateAction<boolean>>;
  trackedOrderIdRef: MutableRefObject<string>;
};

export const useDeliveryStatus = (
  agentOrders: Order[],
): DeliveryStatusState => {
  const [isAgentTracking, setIsAgentTracking] = useState(false);
  const [agentPermissionState, setAgentPermissionState] =
    useState<AgentTrackerPermissionState>('unavailable');
  const [agentTrackerStatus, setAgentTrackerStatus] =
    useState<AgentTrackerStatus>(DEFAULT_TRACKER_STATUS);
  const [agentLastTrackedLocation, setAgentLastTrackedLocation] =
    useState<DeliveryLocation | null>(null);

  const agentTrackerRef = useRef<ReturnType<typeof createAgentTracker> | null>(null);
  const trackedOrderIdRef = useRef('');

  useEffect(() => () => {
    agentTrackerRef.current?.stop();
  }, []);

  useEffect(() => {
    const trackedOrder = trackedOrderIdRef.current
      ? agentOrders.find(order => order.id === trackedOrderIdRef.current) || null
      : null;

    if (!trackedOrder && agentTrackerRef.current) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
      setAgentLastTrackedLocation(null);
      return;
    }

    if (trackedOrder && normalizeStatus(trackedOrder.status_code) === 'DELIVERED' && agentTrackerRef.current) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus({
        lifecycle: 'completed',
        message: 'Delivery completed and GPS tracking stopped.',
      });
    }
  }, [agentOrders]);

  return {
    agentLastTrackedLocation,
    agentPermissionState,
    agentTrackerRef,
    agentTrackerStatus,
    isAgentTracking,
    setAgentLastTrackedLocation,
    setAgentPermissionState,
    setAgentTrackerStatus,
    setIsAgentTracking,
    trackedOrderIdRef,
  };
};
