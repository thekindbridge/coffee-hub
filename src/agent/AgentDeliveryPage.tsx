import { motion } from 'motion/react';
import {
  Bike,
  CheckCircle2,
  Clock3,
  Navigation,
  Phone,
  Radar,
  Route,
} from 'lucide-react';
import type {
  AgentTrackerPermissionState,
  AgentTrackerStatus,
} from './agentTracker';
import type {
  DeliveryAgent,
  DeliveryLocation,
  DeliverySession,
  Order,
} from '../types';

interface AgentDeliveryPageProps {
  order: Order | null;
  deliveryAgent: DeliveryAgent | null;
  deliverySession: DeliverySession | null;
  isTracking: boolean;
  lastTrackedLocation: DeliveryLocation | null;
  permissionState: AgentTrackerPermissionState;
  trackerStatus: AgentTrackerStatus;
  onStartDelivery: () => void | Promise<void>;
  onEndDelivery: () => void | Promise<void>;
}

const buildMapsSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const normalizePhoneForTel = (phone: string) => phone.replace(/[^\d+]/g, '');

const trackerToneClass: Record<AgentTrackerStatus['lifecycle'], string> = {
  idle: 'border-white/10 bg-white/5 text-[#cdbbaa]',
  starting: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
  watching: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  restarting: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  stopped: 'border-white/10 bg-white/5 text-[#cdbbaa]',
  completed: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  denied: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
  error: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
};

export default function AgentDeliveryPage({
  order,
  deliveryAgent,
  deliverySession,
  isTracking,
  lastTrackedLocation,
  permissionState,
  trackerStatus,
  onStartDelivery,
  onEndDelivery,
}: AgentDeliveryPageProps) {
  const startDelivery = async (orderId: string) => {
    if (!orderId) {
      return;
    }

    await onStartDelivery();
  };

  const endDelivery = async (orderId: string) => {
    if (!orderId) {
      return;
    }

    await onEndDelivery();
  };

  if (!order) {
    return (
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] px-6 py-10 text-center text-[#fff8f2]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f0b173]">
          Delivery Queue
        </p>
        <h2 className="mt-3 text-2xl font-semibold">No order is assigned right now.</h2>
        <p className="mt-3 text-sm leading-6 text-[#cdbbaa]">
          Ask the admin to assign a delivery session. Once dispatched, live GPS controls will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,23,18,0.96),rgba(15,10,8,0.98))] text-[#fff8f2] shadow-[0_28px_80px_rgba(9,6,5,0.28)]"
      >
        <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1.2fr,0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#f0b173]">
                  Active Delivery
                </p>
                <h1 className="mt-2 text-[2rem] font-semibold text-[#fff8f2]">Order #{order.id}</h1>
              </div>
              <div className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">
                {order.status}
              </div>
            </div>

            <p className="text-sm leading-6 text-[#cdbbaa]">
              Keep GPS running while you ride. Coffee Hub will update the customer map, ETA, and route in real time.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                  Customer
                </p>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">{order.customer_name}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                  Session
                </p>
                <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                  {deliverySession?.status || 'assigned'}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                  Permission
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-[#fff8f2]">{permissionState}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5">
            <div className="flex items-center gap-2 text-[#f0b173]">
              <Radar size={16} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">GPS health</p>
            </div>

            <div className={`mt-4 rounded-[22px] border px-4 py-4 ${trackerToneClass[trackerStatus.lifecycle]}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">Tracker status</p>
              <p className="mt-2 text-sm font-semibold">{trackerStatus.message}</p>
            </div>

            <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
                Last GPS ping
              </p>
              <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
                {lastTrackedLocation
                  ? `${lastTrackedLocation.lat.toFixed(5)}, ${lastTrackedLocation.lng.toFixed(5)}`
                  : 'Waiting for first location...'}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
        className="grid gap-4 lg:grid-cols-[1fr,0.68fr]"
      >
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_22px_60px_rgba(9,6,5,0.24)]">
          <div className="flex items-center gap-2 text-[#f0b173]">
            <Route size={15} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">Customer drop</p>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#fff8f2]">{order.customer_name}</p>
              <p className="mt-2 text-sm leading-7 text-[#cdbbaa]">{order.address}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={`tel:${normalizePhoneForTel(order.phone)}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-[#fff8f2]"
              >
                <Phone size={16} />
                Call Customer
              </a>
              <a
                href={buildMapsSearchUrl(order.address)}
                rel="noreferrer"
                target="_blank"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-[#fff8f2]"
              >
                <Navigation size={16} />
                Open Route
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_22px_60px_rgba(9,6,5,0.24)]">
          <div className="flex items-center gap-2 text-[#f0b173]">
            <Bike size={15} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">Delivery controls</p>
          </div>

          <div className="mt-4 space-y-3">
            <button
              onClick={() => {
                void startDelivery(order.id);
              }}
              disabled={isTracking}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#ea6a10] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Clock3 size={16} />
              {isTracking ? 'GPS Streaming' : 'Start Delivery'}
            </button>

            <button
              onClick={() => {
                void endDelivery(order.id);
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-[#fff8f2]"
            >
              <CheckCircle2 size={16} />
              End Delivery
            </button>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9aa8b]">
              Assigned partner
            </p>
            <p className="mt-2 text-sm font-semibold text-[#fff8f2]">
              {deliveryAgent?.name || order.delivery_agent_name || 'Coffee Hub Rider'}
            </p>
            <p className="mt-1 text-sm text-[#cdbbaa]">
              {deliveryAgent?.phone || order.delivery_agent_phone || 'Add phone number in delivery_agents for direct calls.'}
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
