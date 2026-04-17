import { useEffect, useMemo, useState } from 'react';
import type { DeliveryAgent, DeliverySession, Order } from '../../../types';
import {
  subscribeToDeliveryAgent,
  subscribeToDeliverySession,
  subscribeToTrackedOrder,
} from '../../../services/firebase/orderTrackingService';

export const useOrderTracking = (order: Order) => {
  const [liveOrder, setLiveOrder] = useState(order);
  const [deliveryAgent, setDeliveryAgent] = useState<DeliveryAgent | null>(null);
  const [deliverySession, setDeliverySession] = useState<DeliverySession | null>(null);

  useEffect(() => {
    setLiveOrder(order);
  }, [order]);

  useEffect(() => {
    const unsubscribe = subscribeToTrackedOrder(
      order.doc_id,
      nextOrder => {
        setLiveOrder(previousOrder => ({
          ...nextOrder,
          items: nextOrder.items && nextOrder.items.length > 0
            ? nextOrder.items
            : previousOrder.items,
        }));
      },
      error => {
        console.error('Failed to subscribe to live order updates', error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [order.doc_id]);

  useEffect(() => {
    const unsubscribe = subscribeToDeliverySession(
      liveOrder.doc_id,
      setDeliverySession,
      error => {
        console.error('Failed to subscribe to delivery session', error);
        setDeliverySession(null);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [liveOrder.doc_id]);

  const agentId = useMemo(
    () => deliverySession?.agent_id || liveOrder.delivery_agent_id || '',
    [deliverySession?.agent_id, liveOrder.delivery_agent_id],
  );

  useEffect(() => {
    if (!agentId) {
      setDeliveryAgent(null);
      return undefined;
    }

    const unsubscribe = subscribeToDeliveryAgent(
      agentId,
      setDeliveryAgent,
      error => {
        console.error('Failed to subscribe to delivery agent profile', error);
        setDeliveryAgent(null);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [agentId]);

  return {
    liveOrder,
    deliveryAgent,
    deliverySession,
    agentId,
  };
};
