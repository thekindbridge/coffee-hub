import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { DeliveryAgent, DeliverySession, Order } from '../../types';
import { useAgentOrders } from '../../hooks/useAgentOrders';
import {
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
  normalizedCurrentEmail: string;
};

export const useDeliveryOrders = ({
  isAdmin,
  isDeliveryAgent,
  normalizedCurrentEmail,
}: UseDeliveryOrdersParams): DeliveryOrdersState => {
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [deliverySessions, setDeliverySessions] = useState<DeliverySession[]>([]);

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
    if (!normalizedCurrentEmail) {
      return null;
    }

    return deliveryAgents.find(agent => {
      const agentEmail = agent.email?.trim().toLowerCase() || '';
      return agent.id === normalizedCurrentEmail || agentEmail === normalizedCurrentEmail;
    }) || null;
  }, [deliveryAgents, normalizedCurrentEmail]);

  const currentAgentId = isDeliveryAgent
    ? (currentDeliveryAgent?.id || normalizedCurrentEmail)
    : '';
  const {
    activeOrders,
    completedOrders,
    orders,
  } = useAgentOrders({
    currentAgentId: isDeliveryAgent ? currentAgentId : '',
  });

  const currentDeliveryOrder = useMemo(() => {
    if (!activeOrders.length) {
      return null;
    }

    const currentOrderId = currentDeliveryAgent?.current_order_id?.trim();
    if (!currentOrderId) {
      return activeOrders[0] || null;
    }

    return activeOrders.find(order => (
      order.id === currentOrderId || order.doc_id === currentOrderId
    )) || activeOrders[0] || null;
  }, [activeOrders, currentDeliveryAgent?.current_order_id]);

  useEffect(() => {
    if (!currentDeliveryOrder?.id) {
      setDeliverySessions([]);
      return;
    }

    const unsubscribe = subscribeToCurrentDeliverySession(
      currentDeliveryOrder.id,
      setDeliverySessions,
      error => {
        console.error('Failed to subscribe to current delivery session', error);
        setDeliverySessions([]);
      },
    );

    return unsubscribe;
  }, [currentDeliveryOrder?.id]);

  const sortedOrders = useMemo(
    () => sortDeliveryOrders([...orders]),
    [orders],
  );

  return {
    activeOrders,
    completedOrders,
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentDeliverySession: deliverySessions[0] || null,
    deliveryAgents,
    deliverySessions,
    orders: sortedOrders,
  };
};
