import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/context/AuthContext';
import { subscribeToUserOrders } from '../services/firebase/ordersRealtimeService';
import { isTerminalOrderStatus } from '../shared/orderStatus';
import type { Order } from '../types';

type UseOrdersOptions = {
  currentUserId: string;
  optimisticOrder?: Order | null;
};

const mergeOrders = (orders: Order[], optimisticOrder?: Order | null) => {
  if (!optimisticOrder) {
    return orders;
  }

  const exists = orders.some(order => (
    order.doc_id === optimisticOrder.doc_id || order.id === optimisticOrder.id
  ));

  return exists ? orders : [optimisticOrder, ...orders];
};

export const useOrders = ({
  currentUserId,
  optimisticOrder = null,
}: UseOrdersOptions) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => mergeOrders([], optimisticOrder));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    setOrders(previousOrders => mergeOrders(previousOrders, optimisticOrder));
  }, [optimisticOrder]);

  useEffect(() => {
    const normalizedUserId =
      user?.uid?.trim().toLowerCase() ||
      user?.email?.trim().toLowerCase() ||
      currentUserId.trim().toLowerCase();

    if (!normalizedUserId) {
      setOrders(mergeOrders([], optimisticOrder));
      setError('');
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToUserOrders(
      normalizedUserId,
      nextOrders => {
        setOrders(mergeOrders(nextOrders, optimisticOrder));
        setError('');
        setIsLoading(false);
      },
      subscriptionError => {
        setError(subscriptionError.message || 'Unable to load your orders right now.');
        setOrders(previousOrders => mergeOrders(previousOrders, optimisticOrder));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [currentUserId, optimisticOrder, refreshNonce, user?.email, user?.uid]);

  const refreshOrders = useCallback(async () => {
    setError('');
    setIsLoading(true);
    setRefreshNonce(previousNonce => previousNonce + 1);
  }, []);

  const activeOrders = useMemo(
    () => orders.filter(order => !isTerminalOrderStatus(order.status_code)),
    [orders],
  );

  const pastOrders = useMemo(
    () => orders.filter(order => isTerminalOrderStatus(order.status_code)),
    [orders],
  );

  return {
    orders,
    activeOrders,
    pastOrders,
    isLoading,
    error,
    refreshOrders,
  };
};
