import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import {
  DEFAULT_TRACKER_STATUS,
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../tracking/agentTracker';
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
  currentDeliveryOrder: Order | null,
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
    if (
      agentTrackerRef.current &&
      trackedOrderIdRef.current &&
      currentDeliveryOrder?.id &&
      currentDeliveryOrder.id !== trackedOrderIdRef.current
    ) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
      setAgentLastTrackedLocation(null);
      return;
    }

    if (!currentDeliveryOrder && agentTrackerRef.current) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
      setAgentLastTrackedLocation(null);
      return;
    }

    if (currentDeliveryOrder?.status_code === 'DELIVERED' && agentTrackerRef.current) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus({
        lifecycle: 'completed',
        message: 'Delivery completed and GPS tracking stopped.',
      });
    }
  }, [currentDeliveryOrder?.doc_id, currentDeliveryOrder?.id, currentDeliveryOrder?.status_code]);

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
