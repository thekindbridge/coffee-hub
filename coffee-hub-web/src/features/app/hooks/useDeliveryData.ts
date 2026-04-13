import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../../../agent/agentTracker';
import { useDeliveryOrders } from '../../../delivery-agent/hooks/useDeliveryOrders';
import { useDeliveryStatus } from '../../../delivery-agent/hooks/useDeliveryStatus';
import type { DeliveryAgent, DeliveryLocation, DeliverySession, Order } from '../../../types';

export type DeliveryData = {
  agentLastTrackedLocation: DeliveryLocation | null;
  agentOrders: Order[];
  agentPermissionState: AgentTrackerPermissionState;
  agentTrackerRef: MutableRefObject<ReturnType<typeof createAgentTracker> | null>;
  agentTrackerStatus: AgentTrackerStatus;
  currentDeliveryAgent: DeliveryAgent | null;
  currentDeliveryOrder: Order | null;
  currentDeliverySession: DeliverySession | null;
  deliveryAgents: DeliveryAgent[];
  deliverySessions: DeliverySession[];
  isAgentTracking: boolean;
  setAgentLastTrackedLocation: Dispatch<SetStateAction<DeliveryLocation | null>>;
  setAgentPermissionState: Dispatch<SetStateAction<AgentTrackerPermissionState>>;
  setAgentTrackerStatus: Dispatch<SetStateAction<AgentTrackerStatus>>;
  setIsAgentTracking: Dispatch<SetStateAction<boolean>>;
  trackedOrderIdRef: MutableRefObject<string>;
};

export const useDeliveryData = (
  isAdmin: boolean,
  isDeliveryAgent: boolean,
  normalizedCurrentEmail: string,
): DeliveryData => {
  const deliveryOrders = useDeliveryOrders({
    isAdmin,
    isDeliveryAgent,
    normalizedCurrentEmail,
  });
  const deliveryStatus = useDeliveryStatus(deliveryOrders.currentDeliveryOrder);

  return {
    agentLastTrackedLocation: deliveryStatus.agentLastTrackedLocation,
    agentOrders: deliveryOrders.orders,
    agentPermissionState: deliveryStatus.agentPermissionState,
    agentTrackerRef: deliveryStatus.agentTrackerRef,
    agentTrackerStatus: deliveryStatus.agentTrackerStatus,
    currentDeliveryAgent: deliveryOrders.currentDeliveryAgent,
    currentDeliveryOrder: deliveryOrders.currentDeliveryOrder,
    currentDeliverySession: deliveryOrders.currentDeliverySession,
    deliveryAgents: deliveryOrders.deliveryAgents,
    deliverySessions: deliveryOrders.deliverySessions,
    isAgentTracking: deliveryStatus.isAgentTracking,
    setAgentLastTrackedLocation: deliveryStatus.setAgentLastTrackedLocation,
    setAgentPermissionState: deliveryStatus.setAgentPermissionState,
    setAgentTrackerStatus: deliveryStatus.setAgentTrackerStatus,
    setIsAgentTracking: deliveryStatus.setIsAgentTracking,
    trackedOrderIdRef: deliveryStatus.trackedOrderIdRef,
  };
};
