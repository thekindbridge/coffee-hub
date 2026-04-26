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
  agentCompletedOrders: Order[];
  agentInProgressOrders: Order[];
  agentLastTrackedLocation: DeliveryLocation | null;
  agentNewOrders: Order[];
  agentOrders: Order[];
  agentOrdersError: string;
  agentPermissionState: AgentTrackerPermissionState;
  agentTrackerRef: MutableRefObject<ReturnType<typeof createAgentTracker> | null>;
  agentTrackerStatus: AgentTrackerStatus;
  currentDeliveryAgent: DeliveryAgent | null;
  currentDeliveryOrder: Order | null;
  currentDeliverySession: DeliverySession | null;
  deliveryAgents: DeliveryAgent[];
  deliverySessions: DeliverySession[];
  isAgentOrdersLoading: boolean;
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
  normalizedCurrentPhone: string,
): DeliveryData => {
  const deliveryOrders = useDeliveryOrders({
    isAdmin,
    isDeliveryAgent,
    normalizedCurrentPhone,
  });
  const deliveryStatus = useDeliveryStatus(deliveryOrders.orders);

  return {
    agentCompletedOrders: deliveryOrders.completedOrders,
    agentInProgressOrders: deliveryOrders.inProgressOrders,
    agentLastTrackedLocation: deliveryStatus.agentLastTrackedLocation,
    agentNewOrders: deliveryOrders.newOrders,
    agentOrders: deliveryOrders.orders,
    agentOrdersError: deliveryOrders.ordersError,
    agentPermissionState: deliveryStatus.agentPermissionState,
    agentTrackerRef: deliveryStatus.agentTrackerRef,
    agentTrackerStatus: deliveryStatus.agentTrackerStatus,
    currentDeliveryAgent: deliveryOrders.currentDeliveryAgent,
    currentDeliveryOrder: deliveryOrders.currentDeliveryOrder,
    currentDeliverySession: deliveryOrders.currentDeliverySession,
    deliveryAgents: deliveryOrders.deliveryAgents,
    deliverySessions: deliveryOrders.deliverySessions,
    isAgentOrdersLoading: deliveryOrders.isOrdersLoading,
    isAgentTracking: deliveryStatus.isAgentTracking,
    setAgentLastTrackedLocation: deliveryStatus.setAgentLastTrackedLocation,
    setAgentPermissionState: deliveryStatus.setAgentPermissionState,
    setAgentTrackerStatus: deliveryStatus.setAgentTrackerStatus,
    setIsAgentTracking: deliveryStatus.setIsAgentTracking,
    trackedOrderIdRef: deliveryStatus.trackedOrderIdRef,
  };
};
