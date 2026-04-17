import { useEffect, useMemo, useState } from 'react';
import { subscribeToDeliveryLocation } from '../../../services/firebase/orderTrackingService';
import type { DeliveryLocation } from '../../../types';
import { normalizeDeliveryLocation } from '../../../utils/deliveryLocation';

type UseLiveDeliveryLocationParams = {
  agentId?: string;
  liveAgentLocation?: DeliveryLocation | null;
  orderDocId?: string;
  orderId: string;
};

type LiveDeliveryLocationState = {
  agentLocation: DeliveryLocation | null;
  trackingLabel: string;
};

export const useLiveDeliveryLocation = ({
  agentId,
  liveAgentLocation,
  orderDocId,
  orderId,
}: UseLiveDeliveryLocationParams): LiveDeliveryLocationState => {
  const normalizedAgentId = agentId?.trim() || '';
  const normalizedOrderDocId = orderDocId?.trim().toUpperCase() || '';
  const normalizedOrderId = orderId.trim().toUpperCase();
  const normalizedExternalAgentLocation = useMemo(
    () => normalizeDeliveryLocation(liveAgentLocation),
    [liveAgentLocation],
  );
  const [subscribedAgentLocation, setSubscribedAgentLocation] = useState<DeliveryLocation | null>(null);
  const [trackingLabel, setTrackingLabel] = useState('Connecting to the rider...');

  useEffect(() => {
    if (normalizedExternalAgentLocation) {
      setSubscribedAgentLocation(null);
      setTrackingLabel('Rider is live on the route.');
      return undefined;
    }

    if (!normalizedOrderDocId && !normalizedAgentId && !normalizedOrderId) {
      setSubscribedAgentLocation(null);
      setTrackingLabel('Enter an order to load live tracking.');
      return undefined;
    }

    const unsubscribe = subscribeToDeliveryLocation({
      agentId: normalizedAgentId,
      onData: nextLocation => {
        if (!nextLocation) {
          setSubscribedAgentLocation(null);
          setTrackingLabel('Waiting for the delivery partner to start sharing location.');
          return;
        }

        setSubscribedAgentLocation(normalizeDeliveryLocation(nextLocation));
        setTrackingLabel('Rider is live on the route.');
      },
      onError: error => {
        console.error('Failed to subscribe to delivery location', error);
        setSubscribedAgentLocation(null);
        setTrackingLabel('Live rider location is unavailable right now.');
      },
      orderDocId: normalizedOrderDocId,
      orderId: normalizedOrderId,
    });

    return unsubscribe;
  }, [
    normalizedExternalAgentLocation,
    normalizedAgentId,
    normalizedOrderDocId,
    normalizedOrderId,
  ]);

  return {
    agentLocation: normalizedExternalAgentLocation ?? subscribedAgentLocation,
    trackingLabel,
  };
};
