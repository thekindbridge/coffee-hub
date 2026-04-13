import { Wallet } from 'lucide-react';
import { useMemo } from 'react';
import type { Order } from '../../types';
import { EarningsSummary } from '../components/EarningsSummary';
import { OrderList } from '../components/OrderList';
import { formatDateTime } from '../utils/formatTime';
import {
  buildDeliveryEarningsSummary,
  getCompletedDeliveryOrders,
  getDeliveryEventTimestamp,
} from '../utils/orderHelpers';

export interface EarningsPageProps {
  orders: Order[];
}

export const EarningsPage = ({ orders }: EarningsPageProps) => {
  const completedOrders = useMemo(() => getCompletedDeliveryOrders(orders), [orders]);
  const earningsSummary = useMemo(
    () => buildDeliveryEarningsSummary(orders),
    [orders],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_22px_60px_rgba(9,6,5,0.24)]">
        <div className="flex items-center gap-2 text-[#f0b173]">
          <Wallet size={16} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">
            Earnings Snapshot
          </p>
        </div>

        <h2 className="mt-3 text-2xl font-semibold">Delivered order earnings</h2>
        <p className="mt-2 text-sm leading-6 text-[#cdbbaa]">
          These totals are derived from completed delivery orders, so the same logic can plug into React Native screens.
        </p>
      </div>

      <EarningsSummary summary={earningsSummary} />

      <OrderList
        emptyMessage="Complete a few deliveries to start building your earnings history."
        getTimestampValue={order => formatDateTime(getDeliveryEventTimestamp(order))}
        orders={completedOrders}
        showAddress
        timestampLabel="Delivered"
      />
    </section>
  );
};

export default EarningsPage;
