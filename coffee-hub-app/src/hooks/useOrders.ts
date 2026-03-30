import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUserIdToken } from '../services/firebase/authService';
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
  const [orders, setOrders] = useState<Order[]>(() => mergeOrders([], optimisticOrder));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrders(previousOrders => mergeOrders(previousOrders, optimisticOrder));
  }, [optimisticOrder]);

  const refreshOrders = useCallback(async () => {
    if (!currentUserId) {
      setOrders(mergeOrders([], optimisticOrder));
      setError('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const idToken = await getCurrentUserIdToken(true);
      const response = await getOrdersRequest({ userId: currentUserId }, idToken);
      setOrders(mergeOrders(response.orders, optimisticOrder));
      setError('');
    } catch (requestError) {
      const typedError = toAppServiceError(
        requestError,
        'Unable to load your orders right now.',
        'network',
      );
      setError(typedError.message);
      setOrders(previousOrders => mergeOrders(previousOrders, optimisticOrder));
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, optimisticOrder]);

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
