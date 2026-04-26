import { Suspense, lazy, useMemo, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Phone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DeliveryTrackingMapSkeleton } from '../../../components/DeliveryTrackingMapSkeleton';
import { OrderStatusTimeline } from '../../../components/orders/OrderStatusTimeline';
import { useOrderTracking } from '../../../features/orders/hooks/useOrderTracking';
import {
  getOrderStatusCustomerCopy,
} from '../../../../shared/orderStatus';
import type {
  DeliveryLocation,
  DeliveryRouteMetrics,
  Order,
} from '../../../types';

const DeliveryTrackingMap = lazy(() => import('../../../components/DeliveryTrackingMap'));

export interface OrderTrackingDetailsProps {
  order: Order;
  coffeeShopLocation: DeliveryLocation;
  onClearTracking?: () => void;
  onBackToOrders?: () => void;
}

const normalizePhoneForTel = (phone: string) => phone.replace(/[^\d+]/g, '');

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(' ');

const statusToneClass: Record<Order['status'], string> = {
  Pending: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  Preparing: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
  'Out for Delivery': 'border-orange-300/25 bg-orange-300/10 text-orange-100',
  Delivered: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  Rejected: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
  Cancelled: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
};

export const OrderTrackingDetails = ({
  order,
  coffeeShopLocation,
  onClearTracking,
  onBackToOrders,
}: OrderTrackingDetailsProps) => {
  const { agentId, deliveryAgent, deliverySession, liveOrder } = useOrderTracking(order);
  const [routeMetrics, setRouteMetrics] = useState<DeliveryRouteMetrics | null>(null);

  const agentPhone = deliveryAgent?.phone || liveOrder.delivery_agent_phone || '';
  const agentVehicle = deliveryAgent?.vehicle_type || liveOrder.delivery_agent_vehicle || '';
  const agentName =
    deliveryAgent?.name ||
    deliverySession?.agent_name ||
    liveOrder.delivery_agent_name ||
    'Agent details pending';
  const displayAgentPhone = agentPhone || '';
  const phoneHref = displayAgentPhone ? `tel:${normalizePhoneForTel(displayAgentPhone)}` : undefined;
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

  const etaLabel = useMemo(() => {
    if (liveOrder.status_code === 'DELIVERED') {
      return 'Delivered';
    }

    if (liveOrder.status_code === 'REJECTED') {
      return 'Order rejected';
    }

    if (liveOrder.status_code === 'CANCELLED') {
      return 'Order cancelled';
    }

    if (routeMetrics?.eta_minutes) {
      return `Arriving in ${routeMetrics.eta_minutes} min`;
    }

    if (liveOrder.status_code === 'OUT_FOR_DELIVERY') {
      return 'Agent is on the way';
    }

    if (liveOrder.status_code === 'PREPARING') {
      return 'Preparing your order';
    }

    return 'Order received';
  }, [liveOrder.status_code, routeMetrics?.eta_minutes]);

  if (
    liveOrder.status_code !== 'REJECTED' &&
    liveOrder.status_code !== 'CANCELLED' &&
    !liveOrder.customer_location
  ) {
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
      <div className="mx-auto flex max-w-screen-lg flex-col gap-4">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#18110d,#0f0a08)] text-[#fff8f2] shadow-[0_18px_50px_rgba(8,5,4,0.24)]"
        >
          <div className="w-full space-y-4 px-5 py-5 sm:px-6">
            {backButton && <div className="flex items-center">{backButton}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#f1b375]">
                  Order Tracking
                </p>
                <h1 className="mt-1 break-words text-[1.6rem] font-semibold text-[#fff8f2] sm:text-[1.9rem]">
                  Order #{liveOrder.id}
                </h1>
              </div>
              <div className={joinClassNames(
                'rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]',
                statusToneClass[liveOrder.status],
              )}>
                {liveOrder.status}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
        >
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_18px_50px_rgba(9,6,5,0.22)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f1b375]">
                Order Status
              </p>
              <div className="text-sm font-semibold text-[#d8c7ba]">
                {etaLabel}
              </div>
            </div>

            <OrderStatusTimeline
              className="border-white/8 bg-white/4"
              statusCode={liveOrder.status_code}
              subtext={etaLabel || getOrderStatusCustomerCopy(liveOrder.status_code)}
            />

            {liveOrder.status_code === 'REJECTED' && liveOrder.rejection_reason && (
              <div className="mt-4 rounded-[24px] border border-rose-300/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-200">
                  Rejection reason
                </p>
                <p className="mt-2 leading-6">{liveOrder.rejection_reason}</p>
              </div>
            )}

            {liveOrder.status_code === 'CANCELLED' && liveOrder.cancellation_reason && (
              <div className="mt-4 rounded-[24px] border border-rose-300/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-200">
                  Cancellation reason
                </p>
                <p className="mt-2 leading-6">{liveOrder.cancellation_reason}</p>
              </div>
            )}
          </div>
        </motion.section>

        {liveOrder.status_code !== 'REJECTED' && liveOrder.status_code !== 'CANCELLED' && (
          <>
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
            >
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_18px_50px_rgba(9,6,5,0.22)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f1b375]">
                  Delivery Partner
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-lg font-semibold text-[#fff8f2]">{agentName}</p>
                  <p className="text-[#d8c7ba]">{agentVehicle || 'Vehicle details will appear here.'}</p>
                  <p className="text-[#d8c7ba]">{displayAgentPhone || 'Phone number will appear here.'}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={phoneHref}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      phoneHref
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'cursor-not-allowed border border-white/10 bg-white/5 text-[#8b7565]'
                    }`}
                  >
                    <Phone size={15} />
                    Call Partner
                  </a>
                  {onClearTracking && (
                    <button
                      onClick={onClearTracking}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[#f5ede3]"
                    >
                      Clear Tracking
                    </button>
                  )}
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f6c18b]">
                  Live Map
                </div>
                <div className="text-xs font-semibold text-[#d8c7ba]">
                  {liveOrder.status_code === 'OUT_FOR_DELIVERY' ? 'Agent on the way' : liveOrder.status}
                </div>
              </div>
              <Suspense
                fallback={(
                  <DeliveryTrackingMapSkeleton
                    className="w-full overflow-hidden rounded-[30px]"
                    mapClassName="h-[520px] w-full sm:h-[640px] lg:h-[720px]"
                  />
                )}
              >
                <DeliveryTrackingMap
                  coffeeShopLocation={coffeeShopLocation}
                  customerLocation={liveOrder.customer_location}
                  liveAgentLocation={liveOrder.delivery_location}
                  onRouteMetricsChange={setRouteMetrics}
                  orderId={liveOrder.id}
                  orderDocId={liveOrder.doc_id}
                  agentId={agentId}
                  className="w-full overflow-hidden rounded-[30px] [&_.pointer-events-none.absolute.inset-x-0.top-0.z-20]:hidden [&_.pointer-events-none.absolute.inset-x-0.bottom-0.z-20]:hidden"
                  mapClassName="h-[520px] w-full sm:h-[640px] lg:h-[720px]"
                />
              </Suspense>
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingDetails;
