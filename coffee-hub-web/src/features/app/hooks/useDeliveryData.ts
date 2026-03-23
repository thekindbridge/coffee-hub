import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import {
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../../../agent/agentTracker';
import type { DeliveryAgent, DeliveryLocation, DeliverySession, Order } from '../../../types';
import { DEFAULT_TRACKER_STATUS } from '../lib/constants';
import {
  mapDeliveryAgentDocToAgent,
  mapDeliverySessionDocToSession,
} from '../lib/firestoreMappers';

export type DeliveryData = {
  deliveryAgents: DeliveryAgent[];
  deliverySessions: DeliverySession[];
  agentTrackerRef: React.MutableRefObject<ReturnType<typeof createAgentTracker> | null>;
  trackedOrderIdRef: React.MutableRefObject<string>;
  isAgentTracking: boolean;
  setIsAgentTracking: Dispatch<SetStateAction<boolean>>;
  agentPermissionState: AgentTrackerPermissionState;
  setAgentPermissionState: Dispatch<SetStateAction<AgentTrackerPermissionState>>;
  agentTrackerStatus: AgentTrackerStatus;
  setAgentTrackerStatus: Dispatch<SetStateAction<AgentTrackerStatus>>;
  agentLastTrackedLocation: DeliveryLocation | null;
  setAgentLastTrackedLocation: Dispatch<SetStateAction<DeliveryLocation | null>>;
  currentDeliveryAgent: DeliveryAgent | null;
  currentDeliverySession: DeliverySession | null;
  currentDeliveryOrder: Order | null;
};

// Needed to type the MutableRefObject without importing React globally
import type React from 'react';

/**
 * Manages real-time delivery agent & session subscriptions
 * and the GPS tracker lifecycle for the current agent.
 */
export const useDeliveryData = (
  isAdmin: boolean,
  isDeliveryAgent: boolean,
  normalizedCurrentEmail: string,
  adminOrders: Order[],
): DeliveryData => {
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [deliverySessions, setDeliverySessions] = useState<DeliverySession[]>([]);
  const [isAgentTracking, setIsAgentTracking] = useState(false);
  const [agentPermissionState, setAgentPermissionState] =
    useState<AgentTrackerPermissionState>('unavailable');
  const [agentTrackerStatus, setAgentTrackerStatus] =
    useState<AgentTrackerStatus>(DEFAULT_TRACKER_STATUS);
  const [agentLastTrackedLocation, setAgentLastTrackedLocation] =
    useState<DeliveryLocation | null>(null);

  const agentTrackerRef = useRef<ReturnType<typeof createAgentTracker> | null>(null);
  const trackedOrderIdRef = useRef('');

  // Delivery agents subscription
  useEffect(() => {
    if (!isAdmin && !isDeliveryAgent) {
      setDeliveryAgents([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'delivery_agents'),
      snapshot => {
        const agents = snapshot.docs
          .filter(d => (d.data() as Record<string, unknown>).accessOnly !== true)
          .map(mapDeliveryAgentDocToAgent);
        setDeliveryAgents(agents);
      },
      error => {
        console.error('Failed to subscribe to delivery agents', error);
        setDeliveryAgents([]);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isAdmin, isDeliveryAgent]);

  // Delivery sessions subscription
  useEffect(() => {
    if (!isAdmin && !isDeliveryAgent) {
      setDeliverySessions([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'delivery_sessions'),
      snapshot => {
        setDeliverySessions(snapshot.docs.map(mapDeliverySessionDocToSession));
      },
      error => {
        console.error('Failed to subscribe to delivery sessions', error);
        setDeliverySessions([]);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isAdmin, isDeliveryAgent]);

  // Stop tracker on unmount
  useEffect(() => {
    return () => {
      agentTrackerRef.current?.stop();
    };
  }, []);

  // Derived values
  const currentDeliveryAgent = useMemo(() => {
    if (!normalizedCurrentEmail) return null;
    return deliveryAgents.find(agent => {
      const agentEmail = agent.email?.trim().toLowerCase() || '';
      return agent.id === normalizedCurrentEmail || agentEmail === normalizedCurrentEmail;
    }) || null;
  }, [deliveryAgents, normalizedCurrentEmail]);

  const currentDeliverySession = useMemo(() => {
    const activeSessions = deliverySessions.filter(session => {
      const sessionOrder = adminOrders.find(o => o.id === session.order_id);
      return Boolean(
        sessionOrder &&
          sessionOrder.status === 'Out for Delivery' &&
          session.status !== 'completed',
      );
    });

    const matchingByOrder = activeSessions.find(
      s => s.order_id === currentDeliveryAgent?.current_order_id,
    );
    if (matchingByOrder) return matchingByOrder;

    const matchingByAgent = activeSessions.find(
      s => s.agent_id === currentDeliveryAgent?.id && s.status !== 'completed',
    );
    if (matchingByAgent) return matchingByAgent;

    return activeSessions.find(session => {
      const sessionOrder = adminOrders.find(o => o.id === session.order_id);
      return sessionOrder?.delivery_agent_email?.trim().toLowerCase() === normalizedCurrentEmail;
    }) || null;
  }, [
    adminOrders,
    currentDeliveryAgent?.current_order_id,
    currentDeliveryAgent?.id,
    deliverySessions,
    normalizedCurrentEmail,
  ]);

  const currentDeliveryOrder = useMemo(() => {
    const targetOrderId =
      currentDeliverySession?.order_id || currentDeliveryAgent?.current_order_id;
    if (targetOrderId) {
      return adminOrders.find(
        o => o.id === targetOrderId && o.status === 'Out for Delivery',
      ) || null;
    }

    return adminOrders.find(
      o =>
        o.status === 'Out for Delivery' &&
        (
          o.delivery_agent_id === currentDeliveryAgent?.id ||
          o.delivery_agent_email?.trim().toLowerCase() === normalizedCurrentEmail
        ),
    ) || null;
  }, [
    adminOrders,
    currentDeliveryAgent?.id,
    currentDeliveryAgent?.current_order_id,
    currentDeliverySession?.order_id,
    normalizedCurrentEmail,
  ]);

  // Stop tracker when delivery order changes or completes
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

    if (currentDeliveryOrder?.status === 'Delivered' && agentTrackerRef.current) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus({
        lifecycle: 'completed',
        message: 'Delivery completed and GPS tracking stopped.',
      });
    }
  }, [currentDeliveryOrder?.doc_id, currentDeliveryOrder?.status]);

  return {
    deliveryAgents,
    deliverySessions,
    agentTrackerRef,
    trackedOrderIdRef,
    isAgentTracking,
    setIsAgentTracking,
    agentPermissionState,
    setAgentPermissionState,
    agentTrackerStatus,
    setAgentTrackerStatus,
    agentLastTrackedLocation,
    setAgentLastTrackedLocation,
    currentDeliveryAgent,
    currentDeliverySession,
    currentDeliveryOrder,
  };
};
