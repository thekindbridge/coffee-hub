import { ShoppingBag } from 'lucide-react';
import type { Order } from '../../../types';
import OrderTrackingPage from '../../../pages/OrderTrackingPage';
import { SHOP_LOCATION } from '../../../config/shopLocation';

type TrackingExperiencePageProps = {
  orderStatus: Order | null;
  trackingOrderId: string;
  trackingError: string;
  isTrackingOrder: boolean;
  onTrackingOrderIdChange: (value: string) => void;
  onTrackOrder: () => void;
  onGoToMenu: () => void;
  onBackToOrders: () => void;
  onClearTracking: () => void;
};

export const TrackingExperiencePage = ({
  orderStatus,
  trackingOrderId,
  trackingError,
  isTrackingOrder,
  onTrackingOrderIdChange,
  onTrackOrder,
  onGoToMenu,
  onBackToOrders,
  onClearTracking,
}: TrackingExperiencePageProps) => (
  <div className="px-4 pb-24 pt-24 sm:px-6">
    {!orderStatus ? (
      <div className="mx-auto max-w-screen-md py-16">
        <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] px-6 py-10 text-center shadow-[0_26px_80px_rgba(0,0,0,0.28)]">
          <ShoppingBag size={64} className="mx-auto mb-6 text-ink-muted opacity-20" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-secondary">
            Live Tracking
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-accent">Track your delivery</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">
            Enter your order ID to open the live map, rider route, and premium delivery updates.
          </p>

          <div className="mx-auto mt-8 max-w-md space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5 text-left">
            <input
              type="text"
              placeholder="Order ID (e.g. COF1001)"
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 uppercase focus:border-primary focus:outline-none"
              value={trackingOrderId}
              onChange={event => onTrackingOrderIdChange(event.target.value.toUpperCase())}
            />
            {trackingError && (
              <p className="text-xs font-bold text-primary">{trackingError}</p>
            )}
            <button
              onClick={onTrackOrder}
              disabled={isTrackingOrder}
              className="w-full rounded-2xl bg-primary py-3 font-bold text-white disabled:opacity-70"
            >
              {isTrackingOrder ? 'TRACKING...' : 'TRACK ORDER'}
            </button>
          </div>

          <button
            onClick={onGoToMenu}
            className="mt-5 w-full rounded-2xl bg-white/5 py-3 font-bold text-ink sm:mx-auto sm:max-w-md"
          >
            Go to Menu
          </button>
        </div>
      </div>
    ) : (
      <OrderTrackingPage
        coffeeShopLocation={SHOP_LOCATION}
        onBackToOrders={onBackToOrders}
        onClearTracking={onClearTracking}
        order={orderStatus}
      />
    )}
  </div>
);
