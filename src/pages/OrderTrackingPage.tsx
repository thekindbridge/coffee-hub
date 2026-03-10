import { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock3,
  Flame,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import DeliveryTrackingMap from '../components/DeliveryTrackingMap';
import { db } from '../firebase';
import type {
  DeliveryAgent,
  DeliveryLocation,
  DeliveryRouteMetrics,
  DeliverySession,
  Order,
} from '../types';

const ORDER_FLOW: Order['status'][] = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];

export interface OrderTrackingPageProps {
  order: Order;
  coffeeShopLocation: DeliveryLocation;
  onClearTracking?: () => void;
}

const STATUS_COPY: Record<Order['status'], string> = {
  Pending: 'Your order is confirmed and waiting to enter the kitchen queue.',
  Preparing: 'Our kitchen is plating your order and getting it ready for dispatch.',
  'Out for Delivery': 'Your delivery partner is on the route with a live ETA.',
  Delivered: 'Delivered successfully. Enjoy your Coffee Hub order.',
};

const normalizePhoneForTel = (phone: string) => phone.replace(/[^\d+]/g, '');

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(' ');

const mapDeliveryAgent = (agentId: string, value: Record<string, unknown>): DeliveryAgent => ({
  id: agentId,
  name: (value.name as string) || 'Delivery Partner',
  phone: (value.phone as string) || '',
  is_active: Boolean(value.isActive ?? false),
  current_order_id: (value.currentOrderId as string) || '',
  last_location:
    value.lastLocation &&
    typeof value.lastLocation === 'object'
      ? {
          lat: Number((value.lastLocation as { lat?: number }).lat ?? 0),
          lng: Number((value.lastLocation as { lng?: number }).lng ?? 0),
        }
      : null,
});

const mapDeliverySession = (orderId: string, value: Record<string, unknown>): DeliverySession => ({
  order_id: orderId,
  order_doc_id: (value.orderDocId as string) || '',
  agent_id: (value.agentId as string) || '',
  agent_name: (value.agentName as string) || '',
  status: ((value.status as DeliverySession['status']) || 'assigned'),
  started_at:
    typeof (value.startedAt as { toDate?: () => Date } | undefined)?.toDate === 'function'
      ? (value.startedAt as { toDate: () => Date }).toDate().toISOString()
      : '',
  completed_at:
    typeof (value.completedAt as { toDate?: () => Date } | undefined)?.toDate === 'function'
      ? (value.completedAt as { toDate: () => Date }).toDate().toISOString()
      : '',
});

const statusToneClass: Record<Order['status'], string> = {
  Pending: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  Preparing: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
  'Out for Delivery': 'border-orange-300/25 bg-orange-300/10 text-orange-100',
  Delivered: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
};

export default function OrderTrackingPage({
  order,
  coffeeShopLocation,
  onClearTracking,
}: OrderTrackingPageProps) {
  const [routeMetrics, setRouteMetrics] = useState<DeliveryRouteMetrics | null>(null);
  const [deliveryAgent, setDeliveryAgent] = useState<DeliveryAgent | null>(null);
  const [deliverySession, setDeliverySession] = useState<DeliverySession | null>(null);

  const currentStepIndex = ORDER_FLOW.indexOf(order.status);
  const agentId = deliverySession?.agent_id || order.delivery_agent_id || '';
  const agentPhone = deliveryAgent?.phone || order.delivery_agent_phone || '';
  const agentName = deliveryAgent?.name || deliverySession?.agent_name || order.delivery_agent_name || 'Delivery Partner';

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'delivery_sessions', order.id),
      snapshot => {
        if (!snapshot.exists()) {
          setDeliverySession(null);
          return;
        }

        setDeliverySession(mapDeliverySession(order.id, snapshot.data() as Record<string, unknown>));
      },
      error => {
        console.error('Failed to subscribe to delivery session', error);
        setDeliverySession(null);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [order.id]);

  useEffect(() => {
    if (!agentId) {
      setDeliveryAgent(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'delivery_agents', agentId),
      snapshot => {
        if (!snapshot.exists()) {
          setDeliveryAgent(null);
          return;
        }

        setDeliveryAgent(mapDeliveryAgent(snapshot.id, snapshot.data() as Record<string, unknown>));
      },
      error => {
        console.error('Failed to subscribe to delivery agent profile', error);
        setDeliveryAgent(null);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [agentId]);

  const etaLabel = useMemo(() => {
    if (order.status === 'Delivered') {
      return 'Delivered';
    }

    if (routeMetrics?.eta_minutes) {
      return `Arriving in ${routeMetrics.eta_minutes} min`;
    }

    if (order.status === 'Out for Delivery') {
      return 'Rider is syncing route...';
    }

    return order.status === 'Preparing' ? 'Dispatching soon' : 'Awaiting kitchen';
  }, [order.status, routeMetrics?.eta_minutes]);

  const trafficLabel = useMemo(() => {
    if (!routeMetrics?.traffic_level) {
      return 'Traffic';
    }

    if (routeMetrics.traffic_level === 'low') {
      return 'Light traffic';
    }

    if (routeMetrics.traffic_level === 'moderate') {
      return 'Moderate traffic';
    }

    return 'Heavy traffic';
  }, [routeMetrics?.traffic_level]);

  const trafficToneClass = useMemo(() => {
    if (routeMetrics?.traffic_level === 'low') {
      return 'text-emerald-200';
    }
    if (routeMetrics?.traffic_level === 'moderate') {
      return 'text-amber-200';
    }
    if (routeMetrics?.traffic_level === 'heavy') {
      return 'text-red-200';
    }
    return 'text-[#c9aa8b]';
  }, [routeMetrics?.traffic_level]);

  if (!order.customer_location) {
    return (
      <div className="px-4 pb-24 pt-24 sm:px-6">
        <div className="mx-auto max-w-screen-lg">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#18110d,#0e0907)] px-6 py-10 text-center text-[#fff8f2]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f1b375]">
              Live Tracking Unavailable
            </p>
            <h2 className="mt-3 text-2xl font-semibold">Customer location was not saved for this order.</h2>
            <p className="mt-3 text-sm leading-6 text-[#d8c7ba]">
              Share delivery location during checkout to unlock the live map, route ETA, and delivery partner tracking.
            </p>
            {onClearTracking && (
              <button
                onClick={onClearTracking}
                className="mt-6 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#fff8f2]"
              >
                Back to tracking search
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-28 pt-24 sm:px-6">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-5">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(36,24,18,0.96),rgba(15,10,8,0.98))] text-[#fff8f2] shadow-[0_28px_90px_rgba(8,5,4,0.32)]"
        >
          <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1.4fr,0.9fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#f1b375]">
                    Order Tracking
                  </p>
                  <h1 className="mt-2 text-[2rem] font-semibold text-[#fff8f2] sm:text-[2.4rem]">
                    Order #{order.id}
                  </h1>
                </div>
                <div className={joinClassNames(
                  'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]',
                  statusToneClass[order.status],
                )}>
                  {order.status}
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-[#d8c7ba]">
                {STATUS_COPY[order.status]}
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                    ETA
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#fff8f2]">{etaLabel}</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                    Distance
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#fff8f2]">
                    {routeMetrics?.distance_text || '--'}
                  </p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                    Traffic
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#fff8f2]">
                    {routeMetrics?.duration_in_traffic_text || '--'}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${trafficToneClass}`}>
                    {trafficLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5">
              <div className="flex items-center gap-2 text-[#f1b375]">
                <Sparkles size={15} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">Live flow</p>
              </div>
              <div className="mt-4 space-y-4">
                {[
                  { label: 'Pending', icon: Clock3 },
                  { label: 'Preparing', icon: Flame },
                  { label: 'Out for Delivery', icon: Bike },
                  { label: 'Delivered', icon: CheckCircle2 },
                ].map((step, index) => {
                  const isComplete = index <= currentStepIndex;
                  const isActive = index === currentStepIndex;

                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                          isComplete
                            ? 'border-orange-300/30 bg-orange-400/20 text-[#fff8f2]'
                            : 'border-white/10 bg-white/5 text-[#8b7565]'
                        }`}
                      >
                        <step.icon size={18} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-[#fff8f2]' : 'text-[#c9aa8b]'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-[#8b7565]">
                          {isComplete ? 'Completed' : 'Waiting'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
        >
          <DeliveryTrackingMap
            coffeeShopLocation={coffeeShopLocation}
            customerLocation={order.customer_location}
            onRouteMetricsChange={setRouteMetrics}
            orderId={order.id}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
          className="grid gap-4 lg:grid-cols-[1fr,0.58fr]"
        >
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_22px_60px_rgba(9,6,5,0.24)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f1b375]">
                  Delivery Partner
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#fff8f2]">{agentName}</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5ede3]">
                {deliverySession?.status || (order.status === 'Out for Delivery' ? 'assigned' : order.status.toLowerCase())}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                  Phone
                </p>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {agentPhone || 'Will appear once assigned'}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                  Session
                </p>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {deliverySession?.status || 'Awaiting dispatch'}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                  Route
                </p>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {routeMetrics?.duration_text || 'Calculating'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={agentPhone ? `tel:${normalizePhoneForTel(agentPhone)}` : undefined}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${
                  agentPhone
                    ? 'bg-[#f97316] text-white hover:bg-[#ea6a10]'
                    : 'cursor-not-allowed border border-white/10 bg-white/5 text-[#8b7565]'
                }`}
              >
                <Phone size={16} />
                Call Partner
              </a>
              {onClearTracking && (
                <button
                  onClick={onClearTracking}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-[#f5ede3]"
                >
                  Clear Tracking
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_22px_60px_rgba(9,6,5,0.24)]">
            <div className="flex items-center gap-2 text-[#f1b375]">
              <MapPin size={15} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">Delivery Address</p>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#f5ede3]">{order.address}</p>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                Payment
              </p>
              <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                {order.payment_method} • {order.payment_status || 'pending'}
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
