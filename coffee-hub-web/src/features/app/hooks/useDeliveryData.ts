import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import {
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../../../agent/agentTracker';
import type { DeliveryAgent, DeliveryLocation, DeliverySession, Order } from '../../../types';
import { DEFAULT_TRACKER_STATUS } from '../lib/constants';
import {
  fetchOrderItemsMap,
  mapDeliveryAgentDocToAgent,
  mapDeliverySessionRecordToSession,
  mapOrderDocToOrder,
} from '../lib/firestoreMappers';

export type DeliveryData = {
  deliveryAgents: DeliveryAgent[];
  deliverySessions: DeliverySession[];
  agentOrders: Order[];
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
): DeliveryData => {
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [deliverySessions, setDeliverySessions] = useState<DeliverySession[]>([]);
  const [activeAgentOrders, setActiveAgentOrders] = useState<Order[]>([]);
  const [deliveredAgentOrders, setDeliveredAgentOrders] = useState<Order[]>([]);
  const [isAgentTracking, setIsAgentTracking] = useState(false);
  const [agentPermissionState, setAgentPermissionState] =
    useState<AgentTrackerPermissionState>('unavailable');
  const [agentTrackerStatus, setAgentTrackerStatus] =
    useState<AgentTrackerStatus>(DEFAULT_TRACKER_STATUS);
  const [agentLastTrackedLocation, setAgentLastTrackedLocation] =
    useState<DeliveryLocation | null>(null);

  const agentTrackerRef = useRef<ReturnType<typeof createAgentTracker> | null>(null);
  const trackedOrderIdRef = useRef('');
  const activeOrdersSnapshotVersionRef = useRef(0);
  const deliveredOrdersSnapshotVersionRef = useRef(0);

  // Delivery agents subscription
  useEffect(() => {
    if (!isAdmin && !isDeliveryAgent) {
      setDeliveryAgents([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'agents'),
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

  const currentDeliveryAgent = useMemo(() => {
    if (!normalizedCurrentEmail) return null;
    return deliveryAgents.find(agent => {
      const agentEmail = agent.email?.trim().toLowerCase() || '';
      return agent.id === normalizedCurrentEmail || agentEmail === normalizedCurrentEmail;
    }) || null;
  }, [deliveryAgents, normalizedCurrentEmail]);

  const currentAgentId = isDeliveryAgent
    ? (currentDeliveryAgent?.id || normalizedCurrentEmail)
    : '';

  const subscribeToAgentOrders = (
    status: 'OUT_FOR_DELIVERY' | 'DELIVERED',
    agentId: string,
    setOrders: Dispatch<SetStateAction<Order[]>>,
    snapshotVersionRef: React.MutableRefObject<number>,
  ) => onSnapshot(
    query(
      collection(db, 'orders'),
      where('assignedAgentId', '==', agentId),
      where('status', '==', status),
    ),
    snapshot => {
      const mappedOrders = snapshot.docs
        .map(mapOrderDocToOrder)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(mappedOrders);

      const snapshotVersion = snapshotVersionRef.current + 1;
      snapshotVersionRef.current = snapshotVersion;

      void (async () => {
        try {
          const orderItemsMap = await fetchOrderItemsMap(mappedOrders.map(order => order.id));
          if (snapshotVersionRef.current !== snapshotVersion) {
            return;
          }

          setOrders(mappedOrders.map(order => ({
            ...order,
            items: orderItemsMap.get(order.id) || order.items || [],
          })));
        } catch (error) {
          console.error(`Failed to hydrate ${status} agent orders`, error);
        }
      })();
    },
    error => {
      console.error(`Failed to subscribe to ${status} agent orders`, error);
      setOrders([]);
    },
  );

  // Agent orders subscriptions
  useEffect(() => {
    if (!isDeliveryAgent || !currentAgentId) {
      setActiveAgentOrders([]);
      setDeliveredAgentOrders([]);
      setDeliverySessions([]);
      return;
    }

    const unsubscribeActive = subscribeToAgentOrders(
      'OUT_FOR_DELIVERY',
      currentAgentId,
      setActiveAgentOrders,
      activeOrdersSnapshotVersionRef,
    );
    const unsubscribeDelivered = subscribeToAgentOrders(
      'DELIVERED',
      currentAgentId,
      setDeliveredAgentOrders,
      deliveredOrdersSnapshotVersionRef,
    );

    return () => {
      unsubscribeActive();
      unsubscribeDelivered();
    };
  }, [currentAgentId, isDeliveryAgent]);

  const agentOrders = useMemo(
    () => [...activeAgentOrders, ...deliveredAgentOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [activeAgentOrders, deliveredAgentOrders],
  );

  const currentDeliveryOrder = useMemo(
    () => activeAgentOrders[0] || null,
    [activeAgentOrders],
  );

  // Current delivery session subscription
  useEffect(() => {
    if (!currentDeliveryOrder?.id) {
      setDeliverySessions([]);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'delivery_sessions', currentDeliveryOrder.id),
      snapshot => {
        if (!snapshot.exists()) {
          setDeliverySessions([]);
          return;
        }

        setDeliverySessions([
          mapDeliverySessionRecordToSession(
            snapshot.id,
            snapshot.data() as Record<string, unknown>,
          ),
        ]);
      },
      error => {
        console.error('Failed to subscribe to current delivery session', error);
        setDeliverySessions([]);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [currentDeliveryOrder?.id]);

  // Stop tracker on unmount
  useEffect(() => {
    return () => {
      agentTrackerRef.current?.stop();
    };
  }, []);

  const currentDeliverySession = deliverySessions[0] || null;

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
    agentOrders,
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
