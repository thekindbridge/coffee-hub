import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type { DeliveryAgent, DeliverySession, Order } from '../../types';
import {
  hydrateOrdersWithItems,
  subscribeToAgentOrdersByStatus,
  subscribeToCurrentDeliverySession,
  subscribeToDeliveryAgents,
} from '../services/deliveryService';
import { sortDeliveryOrders } from '../utils/orderHelpers';

export type DeliveryOrdersState = {
  activeOrders: Order[];
  completedOrders: Order[];
  currentDeliveryAgent: DeliveryAgent | null;
  currentDeliveryOrder: Order | null;
  currentDeliverySession: DeliverySession | null;
  deliveryAgents: DeliveryAgent[];
  deliverySessions: DeliverySession[];
  orders: Order[];
};

type UseDeliveryOrdersParams = {
  isAdmin: boolean;
  isDeliveryAgent: boolean;
  normalizedCurrentPhone: string;
};

export const useDeliveryOrders = ({
  isAdmin,
  isDeliveryAgent,
  normalizedCurrentPhone,
}: UseDeliveryOrdersParams): DeliveryOrdersState => {
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [deliverySessions, setDeliverySessions] = useState<DeliverySession[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const activeOrdersSnapshotVersionRef = useRef(0);
  const completedOrdersSnapshotVersionRef = useRef(0);

  useEffect(() => {
    if (!isAdmin && !isDeliveryAgent) {
      setDeliveryAgents([]);
      return;
    }

    const unsubscribe = subscribeToDeliveryAgents(
      nextAgents => {
        setDeliveryAgents(nextAgents);
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
    if (!normalizedCurrentPhone) {
      return null;
    }

    return deliveryAgents.find(agent =>
      agent.id === normalizedCurrentPhone || agent.phone === normalizedCurrentPhone,
    ) || null;
  }, [deliveryAgents, normalizedCurrentPhone]);

  const currentAgentId = isDeliveryAgent
    ? (currentDeliveryAgent?.id || normalizedCurrentPhone)
    : '';

  const subscribeToHydratedOrders = (
    agentId: string,
    status: 'OUT_FOR_DELIVERY' | 'DELIVERED',
    onOrdersChange: (orders: Order[]) => void,
    snapshotVersionRef: MutableRefObject<number>,
  ) => subscribeToAgentOrdersByStatus(
    agentId,
    status,
    mappedOrders => {
      onOrdersChange(mappedOrders);

      const snapshotVersion = snapshotVersionRef.current + 1;
      snapshotVersionRef.current = snapshotVersion;

      void hydrateOrdersWithItems(mappedOrders)
        .then(hydratedOrders => {
          if (snapshotVersionRef.current !== snapshotVersion) {
            return;
          }

          onOrdersChange(hydratedOrders);
        })
        .catch(error => {
          console.error(`Failed to hydrate ${status} agent orders`, error);
        });
    },
    error => {
      console.error(`Failed to subscribe to ${status} agent orders`, error);
      onOrdersChange([]);
    },
  );

  useEffect(() => {
    if (!isDeliveryAgent || !currentAgentId) {
      setActiveOrders([]);
      setCompletedOrders([]);
      setDeliverySessions([]);
      return;
    }

    const unsubscribeActive = subscribeToHydratedOrders(
      currentAgentId,
      'OUT_FOR_DELIVERY',
      setActiveOrders,
      activeOrdersSnapshotVersionRef,
    );
    const unsubscribeCompleted = subscribeToHydratedOrders(
      currentAgentId,
      'DELIVERED',
      setCompletedOrders,
      completedOrdersSnapshotVersionRef,
    );

    return () => {
      unsubscribeActive();
      unsubscribeCompleted();
    };
  }, [currentAgentId, isDeliveryAgent]);

  const currentDeliveryOrder = useMemo(
    () => activeOrders[0] || null,
    [activeOrders],
  );

  useEffect(() => {
    if (!currentDeliveryOrder?.doc_id) {
      setDeliverySessions([]);
      return;
    }

    const unsubscribe = subscribeToCurrentDeliverySession(
      currentDeliveryOrder.doc_id,
      setDeliverySessions,
      error => {
        console.error('Failed to subscribe to current delivery session', error);
        setDeliverySessions([]);
      },
    );

    return unsubscribe;
  }, [currentDeliveryOrder?.doc_id]);

  const orders = useMemo(
    () => sortDeliveryOrders([...activeOrders, ...completedOrders]),
    [activeOrders, completedOrders],
  );

  return {
    activeOrders,
    completedOrders,
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentDeliverySession: deliverySessions[0] || null,
    deliveryAgents,
    deliverySessions,
    orders,
  };
};
