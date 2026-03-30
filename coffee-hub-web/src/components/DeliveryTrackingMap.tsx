import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleMap,
  PolylineF,
  useJsApiLoader,
} from '@react-google-maps/api';
import { SHOP_LOCATION } from '../config/shopLocation';
import { useLiveDeliveryLocation } from '../features/orders/hooks/useLiveDeliveryLocation';
import type { DeliveryLocation, DeliveryRouteMetrics } from '../types';
import { normalizeDeliveryLocation } from '../utils/deliveryLocation';
import {
  AGENT_ANIMATION_DURATION_MS,
  buildImageMarkerIcon,
  buildLatLngLiteral,
  CUSTOMER_ICON_URL,
  DEFAULT_AGENT_ICON_URL,
  easeOutCubic,
  formatMetricsFromDirections,
  getTrafficStatus,
  GOOGLE_MAPS_SCRIPT_ID,
  joinClassNames,
  MAP_CONTAINER_STYLE,
  MAP_OPTIONS,
  MapMessage,
  ROUTE_ANIMATION_DURATION_MS,
  ROUTE_COLOR,
  ROUTE_THROTTLE_MS,
  SHOP_ICON_URL,
  TrackingMapLoadingState,
  TrackingMapStatusOverlay,
} from './DeliveryTrackingMap.helpers';

const requestFrame = (callback: FrameRequestCallback) =>
  globalThis.requestAnimationFrame(callback);

const cancelFrame = (frameId: number | null) => {
  if (frameId !== null) {
    globalThis.cancelAnimationFrame(frameId);
  }
};

export interface DeliveryTrackingMapProps {
  orderId: string;
  orderDocId?: string;
  agentId?: string;
  coffeeShopLocation: DeliveryLocation;
  customerLocation: DeliveryLocation;
  liveAgentLocation?: DeliveryLocation | null;
  className?: string;
  mapClassName?: string;
  agentIconUrl?: string;
  onRouteMetricsChange?: (metrics: DeliveryRouteMetrics | null) => void;
}

export default function DeliveryTrackingMap({
  orderId,
  orderDocId,
  agentId,
  coffeeShopLocation,
  customerLocation,
  liveAgentLocation,
  className,
  mapClassName,
  agentIconUrl = DEFAULT_AGENT_ICON_URL,
  onRouteMetricsChange,
}: DeliveryTrackingMapProps) {
  // Web-only: this component depends on the Google Maps JS SDK.
  const normalizedOrderId = orderId.trim().toUpperCase();
  const normalizedOrderDocId = orderDocId?.trim().toUpperCase() || '';
  const normalizedAgentId = agentId?.trim() || '';
  const apiKey = (import.meta.env.VITE_GOOGLE_MAP_KEY || '').trim();
  const mapRef = useRef<google.maps.Map | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animatedLocationRef = useRef<DeliveryLocation | null>(null);
  const hasInitializedViewportRef = useRef(false);
  const shopMarkerRef = useRef<google.maps.Marker | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);
  const agentMarkerRef = useRef<google.maps.Marker | null>(null);
  const [animatedAgentLocation, setAnimatedAgentLocation] = useState<DeliveryLocation | null>(null);
  const [animatedRoutePath, setAnimatedRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [routeStrokeColor, setRouteStrokeColor] = useState(ROUTE_COLOR);
  const [routeError, setRouteError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const lastRouteRequestRef = useRef<number>(0);
  const lastRouteOriginTypeRef = useRef<'agent' | 'shop' | ''>('');
  const routeAnimationFrameRef = useRef<number | null>(null);
  const normalizedCustomerLocation = useMemo(
    () => normalizeDeliveryLocation(customerLocation),
    [customerLocation],
  );
  const resolvedCoffeeShopLocation = useMemo(
    () => normalizeDeliveryLocation(coffeeShopLocation) ?? {
      lat: SHOP_LOCATION.lat,
      lng: SHOP_LOCATION.lng,
    },
    [coffeeShopLocation],
  );
  const { agentLocation, trackingLabel } = useLiveDeliveryLocation({
    agentId: normalizedAgentId,
    liveAgentLocation,
    orderDocId: normalizedOrderDocId,
    orderId: normalizedOrderId,
  });

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
  });

  const shopMarkerIcon = useMemo(
    () => (isLoaded ? buildImageMarkerIcon(SHOP_ICON_URL, 40) : undefined),
    [isLoaded],
  );
  const customerMarkerIcon = useMemo(
    () => (isLoaded ? buildImageMarkerIcon(CUSTOMER_ICON_URL, 40) : undefined),
    [isLoaded],
  );
  const agentMarkerIcon = useMemo(
    () => (isLoaded ? buildImageMarkerIcon(agentIconUrl, 45) : undefined),
    [agentIconUrl, isLoaded],
  );

  useEffect(() => {
    hasInitializedViewportRef.current = false;
  }, [normalizedAgentId, normalizedOrderDocId, normalizedOrderId]);

  useEffect(() => {
    if (!normalizedCustomerLocation) {
      setAnimatedRoutePath([]);
      setRouteError('');
      onRouteMetricsChange?.(null);
    }
  }, [normalizedCustomerLocation, onRouteMetricsChange]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isMapReady ||
      !mapRef.current ||
      !normalizedCustomerLocation ||
      !shopMarkerIcon ||
      !customerMarkerIcon
    ) {
      return;
    }

    const map = mapRef.current;

    if (!shopMarkerRef.current) {
      shopMarkerRef.current = new google.maps.Marker({
        map,
        position: resolvedCoffeeShopLocation,
        icon: shopMarkerIcon,
        title: SHOP_LOCATION.name,
      });
    } else {
      shopMarkerRef.current.setMap(map);
      shopMarkerRef.current.setPosition(resolvedCoffeeShopLocation);
      shopMarkerRef.current.setIcon(shopMarkerIcon);
    }

    if (!customerMarkerRef.current) {
      customerMarkerRef.current = new google.maps.Marker({
        map,
        position: normalizedCustomerLocation,
        icon: customerMarkerIcon,
        title: 'Customer',
      });
    } else {
      customerMarkerRef.current.setMap(map);
      customerMarkerRef.current.setPosition(normalizedCustomerLocation);
      customerMarkerRef.current.setIcon(customerMarkerIcon);
    }
  }, [
    isLoaded,
    isMapReady,
    normalizedCustomerLocation,
    resolvedCoffeeShopLocation,
    shopMarkerIcon,
    customerMarkerIcon,
  ]);

  useEffect(() => {
    if (!isLoaded || !isMapReady || !mapRef.current || !agentMarkerIcon) {
      return;
    }

    const map = mapRef.current;

    if (!animatedAgentLocation) {
      if (agentMarkerRef.current) {
        agentMarkerRef.current.setMap(null);
        agentMarkerRef.current = null;
      }
      return;
    }

    if (!agentMarkerRef.current) {
      agentMarkerRef.current = new google.maps.Marker({
        map,
        position: animatedAgentLocation,
        icon: agentMarkerIcon,
        title: 'Delivery partner',
      });
    } else {
      agentMarkerRef.current.setMap(map);
      agentMarkerRef.current.setPosition(animatedAgentLocation);
      agentMarkerRef.current.setIcon(agentMarkerIcon);
    }
  }, [isLoaded, isMapReady, animatedAgentLocation, agentMarkerIcon]);

  useEffect(() => {
    cancelFrame(animationFrameRef.current);
    animationFrameRef.current = null;

    if (!agentLocation) {
      animatedLocationRef.current = null;
      setAnimatedAgentLocation(null);
      return undefined;
    }

    const startLocation = animatedLocationRef.current || agentLocation;
    if (
      startLocation.lat === agentLocation.lat &&
      startLocation.lng === agentLocation.lng
    ) {
      animatedLocationRef.current = agentLocation;
      setAnimatedAgentLocation(agentLocation);
      return undefined;
    }

    const animationStart = performance.now();

    const animate = (frameTime: number) => {
      const progress = Math.min(1, (frameTime - animationStart) / AGENT_ANIMATION_DURATION_MS);
      const easedProgress = easeOutCubic(progress);
      const nextAnimatedLocation = {
        lat: startLocation.lat + ((agentLocation.lat - startLocation.lat) * easedProgress),
        lng: startLocation.lng + ((agentLocation.lng - startLocation.lng) * easedProgress),
      };

      animatedLocationRef.current = nextAnimatedLocation;
      setAnimatedAgentLocation(nextAnimatedLocation);
      mapRef.current?.panTo(nextAnimatedLocation);

      if (progress < 1) {
        animationFrameRef.current = requestFrame(animate);
      }
    };

    animationFrameRef.current = requestFrame(animate);

    return () => {
      cancelFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [agentLocation]);

  useEffect(() => {
    return () => {
      cancelFrame(routeAnimationFrameRef.current);
    };
  }, []);

  const animateRoutePath = (path: google.maps.LatLngLiteral[]) => {
    cancelFrame(routeAnimationFrameRef.current);
    routeAnimationFrameRef.current = null;

    if (path.length <= 2) {
      setAnimatedRoutePath(path);
      return;
    }

    const animationStart = performance.now();
    const totalPoints = path.length;

    const animate = (frameTime: number) => {
      const progress = Math.min(1, (frameTime - animationStart) / ROUTE_ANIMATION_DURATION_MS);
      const easedProgress = easeOutCubic(progress);
      const pointCount = Math.max(2, Math.ceil(totalPoints * easedProgress));

      setAnimatedRoutePath(path.slice(0, pointCount));

      if (progress < 1) {
        routeAnimationFrameRef.current = requestFrame(animate);
      }
    };

    routeAnimationFrameRef.current = requestFrame(animate);
  };

  useEffect(() => {
    if (!isLoaded || !normalizedCustomerLocation) {
      setAnimatedRoutePath([]);
      setRouteError('');
      onRouteMetricsChange?.(null);
      return;
    }

    const now = Date.now();
    const originType: 'agent' | 'shop' = agentLocation ? 'agent' : 'shop';
    const originTypeChanged =
      lastRouteOriginTypeRef.current !== '' && lastRouteOriginTypeRef.current !== originType;
    const isThrottled = now - lastRouteRequestRef.current < ROUTE_THROTTLE_MS;

    if (isThrottled && !originTypeChanged) {
      return;
    }

    lastRouteRequestRef.current = now;
    lastRouteOriginTypeRef.current = originType;

    let isCancelled = false;
    const directionsService = new google.maps.DirectionsService();
    const routeOrigin = agentLocation ?? resolvedCoffeeShopLocation;

    directionsService.route(
      {
        origin: routeOrigin,
        destination: normalizedCustomerLocation,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        if (isCancelled) {
          return;
        }

        if (status === 'OK' && result) {
          setRouteError('');
          const metrics = formatMetricsFromDirections(result);
          onRouteMetricsChange?.(metrics);
          const trafficStatus = getTrafficStatus(result);
          setRouteStrokeColor(trafficStatus.color);

          const overviewPath = result.routes[0]?.overview_path;
          if (overviewPath && overviewPath.length > 0) {
            animateRoutePath(overviewPath.map(buildLatLngLiteral));
          } else {
            setAnimatedRoutePath([]);
          }
          return;
        }

        console.error('Directions failed', status);
        setAnimatedRoutePath([]);
        setRouteError('Route preview is temporarily unavailable.');
        onRouteMetricsChange?.(null);
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [agentLocation, normalizedCustomerLocation, resolvedCoffeeShopLocation, isLoaded, onRouteMetricsChange]);

  useEffect(() => {
    if (!isLoaded || !isMapReady || !mapRef.current || !normalizedCustomerLocation) {
      return;
    }

    if (hasInitializedViewportRef.current) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(resolvedCoffeeShopLocation);
    bounds.extend(normalizedCustomerLocation);
    if (agentLocation) {
      bounds.extend(agentLocation);
    }

    mapRef.current.fitBounds(bounds, 96);
    hasInitializedViewportRef.current = true;
  }, [agentLocation, resolvedCoffeeShopLocation, normalizedCustomerLocation, isLoaded, isMapReady]);

  useEffect(() => {
    return () => {
      cancelFrame(animationFrameRef.current);
    };
  }, []);

  if (!apiKey) {
    return (
      <MapMessage
        title="Google Maps key missing"
        description="Add VITE_GOOGLE_MAP_KEY to your frontend environment before rendering delivery tracking."
        className={className}
      />
    );
  }

  if (!normalizedCustomerLocation) {
    return (
      <MapMessage
        title="Customer location unavailable"
        description="Coffee Hub needs customer coordinates (latitude and longitude) to render live delivery tracking."
        className={className}
      />
    );
  }

  if (loadError) {
    return (
      <MapMessage
        title="Unable to load Google Maps"
        description="The map script failed to load. Check your Google Maps key, enabled APIs, and allowed Vercel domains."
        className={className}
      />
    );
  }

  return (
    <section
      className={joinClassNames(
        'relative w-full overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,#18110d,#0f0a08)] shadow-[0_30px_80px_rgba(9,6,5,0.34)]',
        className,
      )}
    >
      <TrackingMapStatusOverlay
        animatedAgentLocation={animatedAgentLocation}
        routeError={routeError}
        trackingLabel={trackingLabel}
      />

      <div className={joinClassNames('h-[420px] w-full sm:h-[560px]', mapClassName)}>
        {isLoaded ? (
          <GoogleMap
            center={animatedAgentLocation || resolvedCoffeeShopLocation}
            mapContainerStyle={MAP_CONTAINER_STYLE}
            onLoad={map => {
              mapRef.current = map;
              setIsMapReady(true);
            }}
            onUnmount={() => {
              mapRef.current = null;
              setIsMapReady(false);
              if (shopMarkerRef.current) {
                shopMarkerRef.current.setMap(null);
                shopMarkerRef.current = null;
              }
              if (customerMarkerRef.current) {
                customerMarkerRef.current.setMap(null);
                customerMarkerRef.current = null;
              }
              if (agentMarkerRef.current) {
                agentMarkerRef.current.setMap(null);
                agentMarkerRef.current = null;
              }
            }}
            options={MAP_OPTIONS}
            zoom={17}
          >
            {animatedRoutePath.length > 1 && (
              <PolylineF
                path={animatedRoutePath}
                options={{
                  strokeColor: routeStrokeColor,
                  strokeOpacity: 0.9,
                  strokeWeight: 5,
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <TrackingMapLoadingState />
        )}
      </div>
    </section>
  );
}
