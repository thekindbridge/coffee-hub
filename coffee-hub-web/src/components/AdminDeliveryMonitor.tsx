import { useMemo, useState } from 'react';
import { Clock3, MapPin, Radar, Route } from 'lucide-react';
import DeliveryTrackingMap from './DeliveryTrackingMap';
import { SHOP_LOCATION } from '../config/shopLocation';
import type { DeliveryRouteMetrics, Order } from '../types';

interface AdminDeliveryMonitorProps {
  order: Order;
}

const formatLastPing = (updatedAt?: string) => {
  if (!updatedAt) {
    return 'Waiting for first GPS ping';
  }

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) {
    return 'GPS ping received';
  }

  return parsed.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function AdminDeliveryMonitor({
  order,
}: AdminDeliveryMonitorProps) {
  const [routeMetrics, setRouteMetrics] = useState<DeliveryRouteMetrics | null>(null);

  const etaLabel = routeMetrics?.eta_minutes
    ? `${routeMetrics.eta_minutes} min`
    : order.delivery_location
      ? 'Calculating...'
      : 'Awaiting GPS';
  const distanceLabel = routeMetrics?.distance_text || '--';
  const coordinatesLabel = order.delivery_location
    ? `${order.delivery_location.lat.toFixed(5)}, ${order.delivery_location.lng.toFixed(5)}`
    : 'Waiting for first GPS ping';
  const lastPingLabel = useMemo(
    () => formatLastPing(order.delivery_location?.updated_at),
    [order.delivery_location?.updated_at],
  );

  if (!order.customer_location) {
    return (
      <div className="mt-4 rounded-[20px] border border-white/8 bg-white/5 px-4 py-4 text-sm text-ink-muted">
        Customer coordinates are missing, so the live delivery monitor cannot render this route.
      </div>
    );
  }

  return (
    <section className="mt-4 rounded-[24px] border border-white/8 bg-[#120d0b]/88 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
            Live Delivery Monitor
          </p>
          <h3 className="mt-1 text-lg font-semibold text-accent">Order #{order.id}</h3>
        </div>
        <div className="rounded-full border border-orange-300/20 bg-orange-400/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">
          On the way
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2 text-secondary">
            <Clock3 size={14} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">ETA</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-accent">{etaLabel}</p>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2 text-secondary">
            <Route size={14} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Route</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-accent">{distanceLabel}</p>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2 text-secondary">
            <Radar size={14} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Last Ping</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-accent">{lastPingLabel}</p>
        </div>
      </div>

      <div className="mt-3 rounded-[18px] border border-white/8 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-secondary">
          <MapPin size={14} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Live GPS</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-accent">{coordinatesLabel}</p>
      </div>

      <div className="mt-4">
        <DeliveryTrackingMap
          coffeeShopLocation={SHOP_LOCATION}
          customerLocation={order.customer_location}
          liveAgentLocation={order.delivery_location}
          onRouteMetricsChange={setRouteMetrics}
          orderId={order.id}
          orderDocId={order.doc_id}
          agentId={order.delivery_agent_id}
          className="w-full overflow-hidden rounded-[26px]"
          mapClassName="h-[320px] w-full sm:h-[420px]"
        />
      </div>
    </section>
  );
}
