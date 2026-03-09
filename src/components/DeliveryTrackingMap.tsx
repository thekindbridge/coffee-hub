import { useEffect, useRef, useState } from 'react';
import {
  DirectionsRenderer,
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const GOOGLE_MAPS_SCRIPT_ID = 'coffee-hub-delivery-tracking-map';
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};
const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  zoomControl: true,
};
const ROUTE_RENDERER_OPTIONS: google.maps.DirectionsRendererOptions = {
  preserveViewport: true,
  suppressMarkers: true,
  polylineOptions: {
    strokeColor: '#c2410c',
    strokeOpacity: 0.92,
    strokeWeight: 5,
  },
};

export interface DeliveryTrackingLocation {
  lat: number;
  lng: number;
}

export interface DeliveryTrackingMapProps {
  orderId: string;
  coffeeShopLocation: DeliveryTrackingLocation;
  customerLocation: DeliveryTrackingLocation;
  className?: string;
  mapClassName?: string;
}

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(' ');

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidLocation = (
  location: Partial<DeliveryTrackingLocation> | null | undefined,
): location is DeliveryTrackingLocation =>
  isFiniteCoordinate(location?.lat) && isFiniteCoordinate(location?.lng);

const createMarkerIcon = (fillColor: string): google.maps.Symbol => ({
  path: google.maps.SymbolPath.CIRCLE,
  fillColor,
  fillOpacity: 1,
  scale: 9,
  strokeColor: '#fff7ed',
  strokeWeight: 2.5,
});

const MarkerLabelStyles: google.maps.MarkerLabel = {
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: '700',
  text: '',
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
      'flex min-h-[280px] w-full items-center justify-center rounded-[28px] border border-white/10 bg-[#120d0b] px-6 py-10 text-center text-[#fffaf5]',
      className,
    )}
  >
    <div className="max-w-md space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4a373]">
        Delivery Tracking
      </p>
      <h2 className="text-xl font-semibold text-[#fffaf5]">{title}</h2>
      <p className="text-sm leading-6 text-[#d9cabd]">{description}</p>
    </div>
  </div>
);

export default function DeliveryTrackingMap({
  orderId,
  coffeeShopLocation,
  customerLocation,
  className,
  mapClassName,
}: DeliveryTrackingMapProps) {
  const normalizedOrderId = orderId.trim();
  const apiKey = (import.meta.env.VITE_GOOGLE_MAP_KEY || '').trim();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [agentLocation, setAgentLocation] = useState<DeliveryTrackingLocation | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [trackingMessage, setTrackingMessage] = useState(
    'Connecting to live delivery updates...',
  );
  const [routeError, setRouteError] = useState('');
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
  });

  useEffect(() => {
    if (!normalizedOrderId) {
      setAgentLocation(null);
      setDirections(null);
      setTrackingMessage('Order ID is required to subscribe to delivery updates.');
      return undefined;
    }

    setTrackingMessage('Connecting to live delivery updates...');

    const unsubscribe = onSnapshot(
      doc(db, 'agent_locations', normalizedOrderId),
      snapshot => {
        if (!snapshot.exists()) {
          setAgentLocation(null);
          setDirections(null);
          setTrackingMessage('Waiting for the delivery partner to start sharing location.');
          return;
        }

        const nextLocation = snapshot.data() as Partial<DeliveryTrackingLocation>;

        if (!isValidLocation(nextLocation)) {
          setAgentLocation(null);
          setDirections(null);
          setTrackingMessage('Delivery partner location is unavailable right now.');
          return;
        }

        setAgentLocation({
          lat: nextLocation.lat,
          lng: nextLocation.lng,
        });
        setTrackingMessage('Live delivery updates are active.');
      },
      error => {
        console.error('Failed to subscribe to delivery agent location', error);
        setAgentLocation(null);
        setDirections(null);
        setTrackingMessage('Unable to load live delivery updates right now.');
      },
    );

    return unsubscribe;
  }, [normalizedOrderId]);

  useEffect(() => {
    if (!agentLocation || !mapRef.current) {
      return;
    }

    mapRef.current.panTo(agentLocation);
  }, [agentLocation]);

  useEffect(() => {
    if (!isLoaded || !agentLocation) {
      setDirections(null);
      setRouteError('');
      return;
    }

    let isCancelled = false;
    const directionsService = new google.maps.DirectionsService();

    const loadRoute = async () => {
      try {
        setRouteError('');
        const nextDirections = await directionsService.route({
          origin: agentLocation,
          destination: customerLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        if (!isCancelled) {
          setDirections(nextDirections);
        }
      } catch (error) {
        console.error('Failed to render delivery route', error);

        if (!isCancelled) {
          setDirections(null);
          setRouteError('Route preview is temporarily unavailable.');
        }
      }
    };

    void loadRoute();

    return () => {
      isCancelled = true;
    };
  }, [agentLocation, customerLocation.lat, customerLocation.lng, isLoaded]);

  if (!apiKey) {
    return (
      <MapMessage
        title="Missing Google Maps key"
        description="Add VITE_GOOGLE_MAP_KEY to your Vite environment before rendering the delivery map."
        className={className}
      />
    );
  }

  if (!isValidLocation(coffeeShopLocation) || !isValidLocation(customerLocation)) {
    return (
      <MapMessage
        title="Missing location coordinates"
        description="Pass valid lat/lng coordinates for both the coffee shop and the customer before loading delivery tracking."
        className={className}
      />
    );
  }

  if (loadError) {
    return (
      <MapMessage
        title="Unable to load Google Maps"
        description="The Google Maps script failed to load. Check your API key, allowed domains, and enabled APIs."
        className={className}
      />
    );
  }

  const mapCenter = agentLocation || coffeeShopLocation;
  const shopIcon = isLoaded ? createMarkerIcon('#6f4e25') : undefined;
  const agentIcon = isLoaded ? createMarkerIcon('#2563eb') : undefined;
  const customerIcon = isLoaded ? createMarkerIcon('#16a34a') : undefined;

  return (
    <section
      className={joinClassNames(
        'w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#120d0b] text-[#fffaf5] shadow-[0_24px_60px_rgba(18,13,11,0.25)]',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#18120f] px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4a373]">
            Live Delivery Tracking
          </p>
          <p className="mt-1 text-sm text-[#f5ede3]">{trackingMessage}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5ede3]">
          {normalizedOrderId || 'Order ID Missing'}
        </div>
      </header>

      {routeError && (
        <div className="border-b border-white/10 bg-[#2a130a] px-4 py-2 text-sm text-[#f7c59f] sm:px-5">
          {routeError}
        </div>
      )}

      <div className={joinClassNames('h-[420px] w-full sm:h-[520px]', mapClassName)}>
        {isLoaded ? (
          <GoogleMap
            center={mapCenter}
            mapContainerStyle={MAP_CONTAINER_STYLE}
            onLoad={map => {
              mapRef.current = map;
            }}
            onUnmount={() => {
              mapRef.current = null;
            }}
            options={MAP_OPTIONS}
            zoom={15}
          >
            <MarkerF
              icon={shopIcon}
              label={{ ...MarkerLabelStyles, text: 'S' }}
              position={coffeeShopLocation}
              title="Coffee shop"
            />
            <MarkerF
              icon={customerIcon}
              label={{ ...MarkerLabelStyles, text: 'C' }}
              position={customerLocation}
              title="Customer"
            />
            {agentLocation && (
              <MarkerF
                icon={agentIcon}
                label={{ ...MarkerLabelStyles, text: 'A' }}
                position={agentLocation}
                title="Delivery agent"
              />
            )}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={ROUTE_RENDERER_OPTIONS}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(212,163,115,0.14),transparent_34%),linear-gradient(180deg,#120d0b,#0b0806)] px-6 text-center">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4a373]">
                Loading Map
              </p>
              <p className="text-sm text-[#d9cabd]">
                Initializing Google Maps and live delivery markers...
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
