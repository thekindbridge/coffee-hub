import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock3,
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

const ORDER_FLOW: Order['status'][] = [
  'Pending',
  'Preparing',
  'Ready for Pickup',
  'Assigned to Agent',
  'Picked Up',
  'Out for Delivery',
  'Delivered',
];

export interface OrderTrackingPageProps {
  order: Order;
  coffeeShopLocation: DeliveryLocation;
  onClearTracking?: () => void;
  onBackToOrders?: () => void;
}

const normalizePhoneForTel = (phone: string) => phone.replace(/[^\d+]/g, '');

const formatTimelineTime = (value?: string) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return parsed.toLocaleTimeString();
};

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(' ');

const mapDeliveryAgent = (agentId: string, value: Record<string, unknown>): DeliveryAgent => ({
  id: agentId,
  name: (value.name as string) || 'Delivery Partner',
  phone: (value.phone as string) || '',
  email: (value.email as string) || '',
  vehicle_type: (value.vehicleType as string) || '',
  status: typeof value.status === 'string'
    ? (value.status as string).toLowerCase() === 'offline'
      ? 'offline'
      : (value.status as string).toLowerCase() === 'busy'
        ? 'busy'
        : 'available'
    : undefined,
  is_active: Boolean(value.isActive ?? false),
  current_order_id: (value.currentOrderId as string) || '',
  current_location:
    value.currentLocation && typeof value.currentLocation === 'object'
      ? {
          lat: Number((value.currentLocation as { lat?: number }).lat ?? 0),
          lng: Number((value.currentLocation as { lng?: number }).lng ?? 0),
        }
      : null,
  last_location:
    value.lastLocation && typeof value.lastLocation === 'object'
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
  'Ready for Pickup': 'border-violet-300/25 bg-violet-300/10 text-violet-100',
  'Assigned to Agent': 'border-indigo-300/25 bg-indigo-300/10 text-indigo-100',
  'Picked Up': 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
  'Out for Delivery': 'border-orange-300/25 bg-orange-300/10 text-orange-100',
  Delivered: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
};

export default function OrderTrackingPage({
  order,
  coffeeShopLocation,
  onClearTracking,
  onBackToOrders,
}: OrderTrackingPageProps) {
  const [routeMetrics, setRouteMetrics] = useState<DeliveryRouteMetrics | null>(null);
  const [deliveryAgent, setDeliveryAgent] = useState<DeliveryAgent | null>(null);
  const [deliverySession, setDeliverySession] = useState<DeliverySession | null>(null);

  const currentStepIndex = ORDER_FLOW.indexOf(order.status);
  const activeStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const agentId = deliverySession?.agent_id || order.delivery_agent_id || '';
  const agentPhone = deliveryAgent?.phone || order.delivery_agent_phone || '';
  const agentVehicle = deliveryAgent?.vehicle_type || order.delivery_agent_vehicle || '';
  const agentName = deliveryAgent?.name || deliverySession?.agent_name || order.delivery_agent_name || 'Delivery Partner';
  const partnerStatus = order.status;
  const sessionLabel = deliverySession?.status === 'active'
    ? 'Active'
    : deliverySession?.status === 'completed'
      ? 'Completed'
      : deliverySession?.status === 'assigned'
        ? 'Assigned'
        : 'Awaiting dispatch';
  const paymentLabel = order.payment_method === 'razorpay' || order.payment_method === 'Pay Online'
    ? 'Pay Online'
    : order.payment_method;
  const displayAgentPhone = agentPhone || '';
  const phoneHref = displayAgentPhone ? `tel:${normalizePhoneForTel(displayAgentPhone)}` : undefined;
  const stepProgress = ORDER_FLOW.length > 1 ? activeStepIndex / (ORDER_FLOW.length - 1) : 0;
  const stepProgressPercent = Math.max(0, Math.min(1, stepProgress)) * 100;
  const stepProgressWidth = stepProgressPercent === 0
    ? '0%'
    : `calc(${stepProgressPercent}% - 8px)`;
  const backButton = onBackToOrders ? (
    <button
      type="button"
      onClick={onBackToOrders}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-semibold text-[#f5ede3] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1b375]/60"
      aria-label="Back to orders"
    >
      <ArrowLeft size={14} className="text-[#f1b375]" />
      Back
    </button>
  ) : null;

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

    if (order.status === 'Out for Delivery' || order.status === 'Picked Up' || order.status === 'Assigned to Agent') {
      return 'Rider is syncing route...';
    }

    if (order.status === 'Ready for Pickup') {
      return 'Ready for pickup';
    }

    return order.status === 'Preparing' ? 'Preparing order' : 'Awaiting kitchen';
  }, [order.status, routeMetrics?.eta_minutes]);

  const timelineSteps = useMemo(
    () => [
      { label: 'Order placed', time: order.created_at },
      { label: 'Preparing', time: order.preparing_at },
      { label: 'Ready for pickup', time: order.ready_for_pickup_at },
      { label: 'Agent assigned', time: order.delivery_assigned_at },
      { label: 'Picked up', time: order.delivery_picked_at },
      { label: 'Out for delivery', time: order.delivery_out_for_delivery_at || order.delivery_picked_at },
      { label: 'Delivered', time: order.delivery_delivered_at },
    ],
    [
      order.created_at,
      order.preparing_at,
      order.ready_for_pickup_at,
      order.delivery_assigned_at,
      order.delivery_picked_at,
      order.delivery_out_for_delivery_at,
      order.delivery_delivered_at,
    ],
  );

  if (!order.customer_location) {
    return (
      <div className="px-4 pb-20 pt-6 sm:px-6">
        <div className="mx-auto max-w-screen-lg">
          {backButton && <div className="mb-4 flex items-center">{backButton}</div>}
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
    <div className="px-4 pb-20 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-3">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(36,24,18,0.96),rgba(15,10,8,0.98))] text-[#fff8f2] shadow-[0_20px_60px_rgba(8,5,4,0.28)]"
        >
          <div className="w-full space-y-3 px-5 py-4 sm:px-6">
            {backButton && <div className="flex items-center">{backButton}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#f1b375]">
                  Order Tracking
                </p>
                <h1 className="mt-1 break-words text-[1.6rem] font-semibold text-[#fff8f2] sm:text-[1.9rem]">
                  Order #{order.id}
                </h1>
              </div>
              <div className={joinClassNames(
                'rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]',
                statusToneClass[order.status],
              )}>
                {order.status}
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3">
              <div className="min-w-0 rounded-[22px] border border-white/10 bg-white/5 p-3">
                <div className="flex items-start gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c9aa8b] sm:text-[11px]">
                  <Clock3 size={14} className="text-[#f6c18b]" />
                  Estimated Time of Arrival
                </div>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">{etaLabel}</p>
              </div>
              <div className="min-w-0 rounded-[22px] border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9aa8b]">
                  <MapPin size={14} className="text-[#22c55e]" />
                  Distance
                </div>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {routeMetrics?.distance_text || '--'}
                </p>
              </div>
              <div className="min-w-0 rounded-[22px] border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9aa8b]">
                  <Sparkles size={14} className="text-[#f1b375]" />
                  Live Flow
                </div>
                <div className="mt-3 w-full max-w-full overflow-hidden">
                  <div className="relative">
                    <div className="absolute left-2 right-2 top-[9px] h-[2px] rounded-full bg-white/15" />
                    <div
                      className="absolute left-2 top-[9px] h-[2px] rounded-full bg-[#f1b375]"
                      style={{ width: stepProgressWidth }}
                    />
                    <div className="grid grid-cols-7 gap-2">
                      {ORDER_FLOW.map((step, index) => {
                        const isReached = index <= activeStepIndex;
                        const isCurrent = index === activeStepIndex;

                        return (
                          <div key={step} className="min-w-0 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <div
                                aria-current={isCurrent ? 'step' : undefined}
                                className={joinClassNames(
                                  'h-2.5 w-2.5 rounded-full border transition-colors',
                                  isReached ? 'border-[#f1b375] bg-[#f1b375]' : 'border-white/20 bg-[#0f0a08]',
                                  isCurrent ? 'shadow-[0_0_0_4px_rgba(241,179,117,0.15)]' : undefined,
                                )}
                              />
                              <span
                                className={joinClassNames(
                                  'text-[9px] font-semibold uppercase tracking-[0.12em] leading-4 break-words sm:text-[10px]',
                                  isCurrent ? 'text-[#fff8f2]' : isReached ? 'text-[#f5ede3]' : 'text-[#8b7565]',
                                )}
                              >
                                {step}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f6c18b]">
              Live Route
            </div>
            <div className="text-xs font-semibold text-[#d8c7ba]">
              {order.status === 'Assigned to Agent' || order.status === 'Picked Up' || order.status === 'Out for Delivery'
                ? 'Rider on the way'
                : order.status}
            </div>
          </div>
          <DeliveryTrackingMap
            coffeeShopLocation={coffeeShopLocation}
            customerLocation={order.customer_location}
            onRouteMetricsChange={setRouteMetrics}
            orderId={order.id}
            agentId={agentId}
            className="w-full overflow-hidden rounded-[30px] [&_.pointer-events-none.absolute.inset-x-0.top-0.z-20]:hidden [&_.pointer-events-none.absolute.inset-x-0.bottom-0.z-20]:hidden"
            mapClassName="h-[520px] w-full sm:h-[640px] lg:h-[720px]"
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
        >
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_20px_50px_rgba(9,6,5,0.22)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f1b375]">
              Delivery Timeline
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#fff8f2]">Order lifecycle</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {timelineSteps.map(step => (
                <div
                  key={step.label}
                  className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9aa8b]">
                    {step.label}
                  </span>
                  <span className="text-sm font-semibold text-[#fff8f2]">
                    {formatTimelineTime(step.time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
          className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]"
        >
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-4 text-[#fff8f2] shadow-[0_20px_50px_rgba(9,6,5,0.22)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f1b375]">
                  Delivery Partner
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#fff8f2]">{agentName}</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f5ede3]">
                {partnerStatus}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9aa8b]">
                  <Bike size={13} className="text-[#f6c18b]" />
                  Session
                </div>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {sessionLabel}
                </p>
              </div>
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9aa8b]">
                  <Clock3 size={13} className="text-[#f1b375]" />
                  Route Time
                </div>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {routeMetrics?.duration_text || 'Calculating'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9aa8b]">
                  Partner
                </p>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {agentName}
                </p>
              </div>
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9aa8b]">
                  Vehicle
                </p>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {agentVehicle || '--'}
                </p>
              </div>
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9aa8b]">
                  Phone
                </p>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {displayAgentPhone || '--'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={phoneHref}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                  phoneHref
                    ? 'bg-[#f97316] text-white hover:bg-[#ea6a10]'
                    : 'cursor-not-allowed border border-white/10 bg-white/5 text-[#8b7565]'
                }`}
              >
                <Phone size={15} />
                Call Partner
              </a>
              {onClearTracking && (
                <button
                  onClick={onClearTracking}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-[#f5ede3]"
                >
                  Clear Tracking
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-4 text-[#fff8f2] shadow-[0_20px_50px_rgba(9,6,5,0.22)]">
              <div className="flex items-center gap-2 text-[#f1b375]">
                <MapPin size={14} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em]">Delivery Address</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#f5ede3]">{order.address || 'Delivery address'}</p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-4 text-[#fff8f2] shadow-[0_20px_50px_rgba(9,6,5,0.22)]">
              <div className="flex items-center gap-2 text-[#f1b375]">
                <CheckCircle2 size={14} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em]">Payment Info</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#f5ede3]">{paymentLabel}</p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
