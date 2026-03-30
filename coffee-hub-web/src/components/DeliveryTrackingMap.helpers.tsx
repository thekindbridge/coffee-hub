import { Bike, MapPin, Store } from 'lucide-react';
import type { DeliveryLocation, DeliveryRouteMetrics } from '../types';
import { normalizeDeliveryLocation } from '../utils/deliveryLocation';

export const GOOGLE_MAPS_SCRIPT_ID = 'coffee-hub-premium-delivery-tracking-map';
export const DEFAULT_AGENT_ICON_URL = '/assets/icons/delivery-scooter.png';
export const SHOP_ICON_URL = '/assets/icons/coffee-shop.png';
export const CUSTOMER_ICON_URL = '/assets/icons/customer-home.png';
export const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};
export const ROUTE_COLOR = '#ff7a18';
export const ROUTE_ANIMATION_DURATION_MS = 1200;
export const AGENT_ANIMATION_DURATION_MS = 1000;
export const ROUTE_THROTTLE_MS = 8000;

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

export const MAP_OPTIONS: google.maps.MapOptions = {
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

export const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(' ');

export const normalizeLocationRecord = normalizeDeliveryLocation;

export const easeOutCubic = (value: number) => 1 - ((1 - value) ** 3);

export const getTrafficStatus = (directions: google.maps.DirectionsResult) => {
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

export const buildLatLngLiteral = (point: google.maps.LatLng) => ({
  lat: point.lat(),
  lng: point.lng(),
});

export const buildImageMarkerIcon = (url: string, size: number): google.maps.Icon => ({
  url,
  scaledSize: new google.maps.Size(size, size),
  anchor: new google.maps.Point(size / 2, size / 2),
});

export const formatMetricsFromDirections = (
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

export const MapMessage = ({
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

export const TrackingMapLoadingState = () => (
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
);

export const TrackingMapStatusOverlay = ({
  animatedAgentLocation,
  routeError,
  trackingLabel,
}: {
  animatedAgentLocation: DeliveryLocation | null;
  routeError: string;
  trackingLabel: string;
}) => (
  <>
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
  </>
);
