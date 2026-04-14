import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/context/AuthContext';
import { getOrdersRequest } from '../services/ordersService';
import { toAppServiceError } from '../services/serviceError';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrders(previousOrders => mergeOrders(previousOrders, optimisticOrder));
  }, [optimisticOrder]);

  const refreshOrders = useCallback(async () => {
    const userEmail = user?.email?.trim().toLowerCase() || currentUserId.trim().toLowerCase();
    if (!userEmail) {
      console.log('[useOrders] refresh:skipped-no-user');
      setOrders(mergeOrders([], optimisticOrder));
      setError('');
      setIsLoading(false);
      return;
    }

    console.log('[useOrders] refresh:start', {
      currentUserId,
      hasOptimisticOrder: Boolean(optimisticOrder),
      userEmail,
    });
    setIsLoading(true);

    try {
      const response = await getOrdersRequest({ userId: userEmail });
      console.log('[useOrders] refresh:success', {
        orderCount: response.orders.length,
        userEmail,
      });
      setOrders(mergeOrders(response.orders, optimisticOrder));
      setError('');
    } catch (requestError) {
      const typedError = toAppServiceError(
        requestError,
        'Unable to load your orders right now.',
        'network',
      );
      console.error('[useOrders] refresh:error', {
        rawError: requestError,
        userEmail,
      });
      setError(typedError.message);
      setOrders(previousOrders => mergeOrders(previousOrders, optimisticOrder));
    } finally {
      console.log('[useOrders] refresh:complete', { userEmail });
      setIsLoading(false);
    }
  }, [currentUserId, optimisticOrder, user]);

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  const activeOrders = useMemo(
    () => orders.filter(order => !['DELIVERED', 'REJECTED', 'CANCELLED'].includes(order.status_code)),
    [orders],
  );

  const pastOrders = useMemo(
    () => orders.filter(order => ['DELIVERED', 'REJECTED', 'CANCELLED'].includes(order.status_code)),
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
