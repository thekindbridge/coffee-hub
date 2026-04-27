import { useEffect, useMemo, useRef, useState } from 'react';
import type { DeliveryAgent, DeliverySession, Order } from '../../types';
import {
  classifyAgentOrders,
  sortDeliveryOrders,
} from '../utils/orderHelpers';
import {
  hydrateOrdersWithItems,
  subscribeToAgentDeliverySessions,
  subscribeToAgentOrders,
  subscribeToDeliveryAgents,
} from '../services/deliveryService';

export type DeliveryOrdersState = {
  completedOrders: Order[];
  currentDeliveryAgent: DeliveryAgent | null;
  currentDeliveryOrder: Order | null;
  currentDeliverySession: DeliverySession | null;
  deliveryAgents: DeliveryAgent[];
  deliverySessions: DeliverySession[];
  inProgressOrders: Order[];
  isOrdersLoading: boolean;
  newOrders: Order[];
  orders: Order[];
  ordersError: string;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const ordersSnapshotVersionRef = useRef(0);

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

  useEffect(() => {
    if (!isDeliveryAgent || !currentAgentId) {
      setOrders([]);
      setDeliverySessions([]);
      setOrdersError('');
      setIsOrdersLoading(false);
      return;
    }

    setOrdersError('');
    setIsOrdersLoading(true);

    const unsubscribeOrders = subscribeToAgentOrders(
      currentAgentId,
      mappedOrders => {
        setIsOrdersLoading(false);
        setOrders(mappedOrders);

        const snapshotVersion = ordersSnapshotVersionRef.current + 1;
        ordersSnapshotVersionRef.current = snapshotVersion;

        void hydrateOrdersWithItems(mappedOrders)
          .then(hydratedOrders => {
            if (ordersSnapshotVersionRef.current !== snapshotVersion) {
              return;
            }

            setOrders(hydratedOrders);
          })
          .catch(error => {
            console.error('Failed to hydrate agent orders', error);
          });
      },
      error => {
        console.error('Failed to subscribe to agent orders', error);
        setOrders([]);
        setOrdersError('Unable to load delivery orders right now.');
        setIsOrdersLoading(false);
      },
    );

    const unsubscribeSessions = subscribeToAgentDeliverySessions(
      currentAgentId,
      nextSessions => {
        setDeliverySessions(nextSessions);
      },
      error => {
        console.error('Failed to subscribe to agent delivery sessions', error);
        setDeliverySessions([]);
      },
    );

    return () => {
      unsubscribeOrders();
      unsubscribeSessions();
    };
  }, [currentAgentId, isDeliveryAgent]);

  const groupedOrders = useMemo(
    () => classifyAgentOrders(orders, deliverySessions),
    [deliverySessions, orders],
  );

  const filteredNewOrders = useMemo(() => {
    if (!currentDeliveryAgent?.is_active) {
      return [];
    }

    return groupedOrders.newOrders;
  }, [currentDeliveryAgent?.is_active, groupedOrders.newOrders]);

  const currentDeliveryOrder = groupedOrders.inProgressOrders[0] || filteredNewOrders[0] || null;

  const currentDeliverySession = useMemo(() => {
    if (!currentDeliveryOrder) {
      return null;
    }

    return deliverySessions.find(session =>
      session.order_doc_id === currentDeliveryOrder.doc_id ||
      session.order_id === currentDeliveryOrder.id,
    ) || null;
  }, [currentDeliveryOrder, deliverySessions]);

  return {
    completedOrders: groupedOrders.completedOrders,
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentDeliverySession,
    deliveryAgents,
    deliverySessions,
    inProgressOrders: groupedOrders.inProgressOrders,
    isOrdersLoading,
    newOrders: filteredNewOrders,
    orders: sortDeliveryOrders(groupedOrders.executableOrders),
    ordersError,
  };
};
