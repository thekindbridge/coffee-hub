import { useEffect, useMemo, useRef, useState } from 'react';
import { hydrateOrdersWithItems } from '../delivery-agent/services/deliveryService';
import { subscribeToAgentOrders } from '../services/firebase/ordersRealtimeService';
import type { Order } from '../types';

type UseAgentOrdersOptions = {
  currentAgentId: string;
};

export const useAgentOrders = ({ currentAgentId }: UseAgentOrdersOptions) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(currentAgentId));
  const snapshotVersionRef = useRef(0);

  useEffect(() => {
    const normalizedAgentId = currentAgentId.trim().toLowerCase();
    if (!normalizedAgentId) {
      setOrders([]);
      setError('');
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToAgentOrders(
      normalizedAgentId,
      nextOrders => {
        setOrders(nextOrders);
        setError('');
        setIsLoading(false);

        const nextSnapshotVersion = snapshotVersionRef.current + 1;
        snapshotVersionRef.current = nextSnapshotVersion;

        void hydrateOrdersWithItems(nextOrders)
          .then(hydratedOrders => {
            if (snapshotVersionRef.current !== nextSnapshotVersion) {
              return;
            }

            setOrders(hydratedOrders);
          })
          .catch(() => undefined);
      },
      subscriptionError => {
        setOrders([]);
        setError(subscriptionError.message || 'Unable to sync assigned orders.');
        setIsLoading(false);
      },
    );

    return () => {
      snapshotVersionRef.current += 1;
      unsubscribe();
    };
  }, [currentAgentId]);

  const activeOrders = useMemo(
    () => orders.filter(order => (
      order.status_code !== 'DELIVERED' &&
      order.status_code !== 'REJECTED' &&
      order.status_code !== 'CANCELLED'
    )),
    [orders],
  );

  const completedOrders = useMemo(
    () => orders.filter(order => order.status_code === 'DELIVERED'),
    [orders],
  );

  return {
    activeOrders,
    completedOrders,
    error,
    isLoading,
    orders,
  };
};
