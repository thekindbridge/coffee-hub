import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleMap,
  PolylineF,
  useJsApiLoader,
} from '@react-google-maps/api';
import { doc, onSnapshot } from 'firebase/firestore';
import { Bike, MapPin, Store } from 'lucide-react';
import { db } from '../firebase';
import type { DeliveryLocation, DeliveryRouteMetrics } from '../types';

const GOOGLE_MAPS_SCRIPT_ID = 'coffee-hub-premium-delivery-tracking-map';
const DEFAULT_AGENT_ICON_URL = '/assets/icons/delivery-scooter.png';
const SHOP_ICON_URL = '/assets/icons/coffee-shop.png';
const CUSTOMER_ICON_URL = '/assets/icons/customer-home.png';
const COFFEE_SHOP_LOCATION: DeliveryLocation = {
  lat: 15.5057,
  lng: 80.0499,
};
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};
const ROUTE_COLOR = '#ff7a18';
const ROUTE_ANIMATION_DURATION_MS = 1200;
const AGENT_ANIMATION_DURATION_MS = 1000;
const ROUTE_THROTTLE_MS = 8000;
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#15110f' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9f8b7b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#110d0b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2b241f' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#211915' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#16211b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d241f' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#382d27' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4b372b' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#6a4934' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e1714' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e2331' }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  disableDefaultUI: true,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  keyboardShortcuts: false,
  mapTypeControl: false,
  streetViewControl: false,
  styles: DARK_MAP_STYLES,
  zoomControl: true,
};

export interface DeliveryTrackingMapProps {
  orderId: string;
  coffeeShopLocation: DeliveryLocation;
  customerLocation: DeliveryLocation;
  className?: string;
  mapClassName?: string;
  agentIconUrl?: string;
  onRouteMetricsChange?: (metrics: DeliveryRouteMetrics | null) => void;
}

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(' ');

const isCoordinateInRange = (value: number, minimum: number, maximum: number) =>
  value >= minimum && value <= maximum;

const normalizeLocationRecord = (value: unknown): DeliveryLocation | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  const accuracy = Number(data.accuracy);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !isCoordinateInRange(lat, -90, 90) ||
    !isCoordinateInRange(lng, -180, 180) ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
  };
};

const easeOutCubic = (value: number) => 1 - ((1 - value) ** 3);

const getTrafficStatus = (directions: google.maps.DirectionsResult) => {
  const leg = directions.routes[0]?.legs[0];
  const durationSeconds = leg?.duration?.value;
  const durationInTrafficSeconds = leg?.duration_in_traffic?.value;

  if (
    typeof durationSeconds !== 'number' ||
    typeof durationInTrafficSeconds !== 'number' ||
    durationSeconds <= 0
  ) {
    return {
      level: null,
      ratio: null,
      color: ROUTE_COLOR,
    };
  }

  const ratio = durationInTrafficSeconds / durationSeconds;
  if (ratio <= 1.15) {
    return { level: 'low' as const, ratio, color: '#22c55e' };
  }

  if (ratio <= 1.35) {
    return { level: 'moderate' as const, ratio, color: ROUTE_COLOR };
  }

  return { level: 'heavy' as const, ratio, color: '#ef4444' };
};

const buildLatLngLiteral = (point: google.maps.LatLng) => ({
  lat: point.lat(),
  lng: point.lng(),
});

const buildImageMarkerIcon = (url: string, size: number): google.maps.Icon => ({
  url,
  scaledSize: new google.maps.Size(size, size),
  anchor: new google.maps.Point(size / 2, size / 2),
});

const formatMetricsFromDirections = (
  directions: google.maps.DirectionsResult,
): DeliveryRouteMetrics | null => {
  const primaryLeg = directions.routes[0]?.legs[0];
  if (!primaryLeg) {
    return null;
  }

  const durationInTrafficSeconds = primaryLeg.duration_in_traffic?.value ?? primaryLeg.duration?.value;
  const etaMinutes = typeof durationInTrafficSeconds === 'number'
    ? Math.max(1, Math.round(durationInTrafficSeconds / 60))
    : null;
  const trafficStatus = getTrafficStatus(directions);

  return {
    distance_meters: primaryLeg.distance?.value ?? null,
    distance_text: primaryLeg.distance?.text || '--',
    duration_text: primaryLeg.duration?.text || '--',
    duration_in_traffic_text: primaryLeg.duration_in_traffic?.text || primaryLeg.duration?.text || '--',
    eta_minutes: etaMinutes,
    traffic_level: trafficStatus.level,
    traffic_ratio: trafficStatus.ratio,
  };
};

const MapMessage = ({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) => (
  <div
    className={joinClassNames(
      'flex min-h-[380px] w-full items-center justify-center rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#17110e,#0d0907)] px-6 py-10 text-center text-[#fff8f2]',
      className,
    )}
  >
    <div className="max-w-lg space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#e1a66c]">
        Live Delivery Tracking
      </p>
      <h2 className="text-2xl font-semibold text-[#fff8f2]">{title}</h2>
      <p className="text-sm leading-6 text-[#d8c7ba]">{description}</p>
    </div>
  </div>
);

export default function DeliveryTrackingMap({
  orderId,
  coffeeShopLocation,
  customerLocation,
  className,
  mapClassName,
  agentIconUrl = DEFAULT_AGENT_ICON_URL,
  onRouteMetricsChange,
}: DeliveryTrackingMapProps) {
  const normalizedOrderId = orderId.trim().toUpperCase();
  const apiKey = (import.meta.env.VITE_GOOGLE_MAP_KEY || '').trim();
  const mapRef = useRef<google.maps.Map | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animatedLocationRef = useRef<DeliveryLocation | null>(null);
  const hasInitializedViewportRef = useRef(false);
  const shopMarkerRef = useRef<google.maps.Marker | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);
  const agentMarkerRef = useRef<google.maps.Marker | null>(null);
  const [agentLocation, setAgentLocation] = useState<DeliveryLocation | null>(null);
  const [animatedAgentLocation, setAnimatedAgentLocation] = useState<DeliveryLocation | null>(null);
  const [animatedRoutePath, setAnimatedRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [routeStrokeColor, setRouteStrokeColor] = useState(ROUTE_COLOR);
  const [trackingLabel, setTrackingLabel] = useState('Connecting to the rider...');
  const [routeError, setRouteError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const lastRouteRequestRef = useRef<number>(0);
  const lastRouteOriginTypeRef = useRef<'agent' | 'shop' | ''>('');
  const routeAnimationFrameRef = useRef<number | null>(null);
  const normalizedCustomerLocation = useMemo(
    () => normalizeLocationRecord(customerLocation),
    [customerLocation],
  );
  const resolvedCoffeeShopLocation = useMemo(
    () => normalizeLocationRecord(coffeeShopLocation) ?? COFFEE_SHOP_LOCATION,
    [coffeeShopLocation],
  );

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
  }, [normalizedOrderId]);

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
        title: 'Coffee Hub',
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
    if (!normalizedOrderId) {
      setAgentLocation(null);
      setAnimatedAgentLocation(null);
      setAnimatedRoutePath([]);
      setTrackingLabel('Enter an order to load live tracking.');
      onRouteMetricsChange?.(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'agent_locations', normalizedOrderId),
      snapshot => {
        if (!snapshot.exists()) {
          setAgentLocation(null);
          setAnimatedAgentLocation(null);
          setAnimatedRoutePath([]);
          setTrackingLabel('Waiting for the delivery partner to start sharing location.');
          onRouteMetricsChange?.(null);
          return;
        }

        const nextLocation = normalizeLocationRecord(snapshot.data());
        if (!nextLocation) {
          setAgentLocation(null);
          setAnimatedAgentLocation(null);
          setAnimatedRoutePath([]);
          setTrackingLabel('Waiting for a live GPS ping from the rider.');
          onRouteMetricsChange?.(null);
          return;
        }

        setAgentLocation(nextLocation);
        setTrackingLabel('Rider is live on the route.');
      },
      error => {
        console.error('Failed to subscribe to delivery location', error);
        setAgentLocation(null);
        setAnimatedAgentLocation(null);
        setAnimatedRoutePath([]);
        setTrackingLabel('Unable to load the rider location right now.');
        onRouteMetricsChange?.(null);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [normalizedOrderId, onRouteMetricsChange]);

  useEffect(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

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
        animationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [agentLocation]);

  useEffect(() => {
    return () => {
      if (routeAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(routeAnimationFrameRef.current);
      }
    };
  }, []);

  const animateRoutePath = (path: google.maps.LatLngLiteral[]) => {
    if (routeAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(routeAnimationFrameRef.current);
      routeAnimationFrameRef.current = null;
    }

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
        routeAnimationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };

    routeAnimationFrameRef.current = window.requestAnimationFrame(animate);
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
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-[linear-gradient(180deg,rgba(10,7,6,0.94),rgba(10,7,6,0.36),transparent)] px-4 pb-12 pt-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f6c18b] backdrop-blur-xl">
            Live route
          </div>
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f5ede3] backdrop-blur-xl">
            {trackingLabel}
          </div>
        </div>
      </div>

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
            zoom={15}
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
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.15),transparent_34%),linear-gradient(180deg,#18110d,#0f0a08)] px-6 text-center">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f6c18b]">
                Initializing Map
              </p>
              <p className="text-sm leading-6 text-[#d8c7ba]">
                Loading Google Maps, delivery route, and live rider updates...
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 grid gap-2 bg-[linear-gradient(0deg,rgba(10,7,6,0.96),rgba(10,7,6,0.34),transparent)] px-4 pb-4 pt-10 sm:px-5">
        {routeError && (
          <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#382113]/88 px-4 py-3 text-sm text-[#fcd9b1] backdrop-blur-xl">
            {routeError}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[#f5ede3]">
              <Store size={14} className="text-[#f6c18b]" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Coffee shop</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[#f5ede3]">
              <Bike size={14} className="text-[#f97316]" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                {animatedAgentLocation ? 'Agent live' : 'Awaiting rider'}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[#f5ede3]">
              <MapPin size={14} className="text-[#22c55e]" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Customer stop</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
