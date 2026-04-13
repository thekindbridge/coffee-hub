import { ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Order } from '../../types';
import { OrderList } from '../components/OrderList';
import { StatusToggle } from '../components/StatusToggle';
import {
  DELIVERY_ORDER_FILTERS,
  type DeliveryOrderFilterId,
} from '../constants/deliveryStatus';
import { formatDateTime } from '../utils/formatTime';
import {
  getActiveDeliveryOrders,
  getCompletedDeliveryOrders,
  getDeliveryEventTimestamp,
} from '../utils/orderHelpers';

export interface OrdersPageProps {
  initialFilter?: DeliveryOrderFilterId;
  orders: Order[];
}

export const OrdersPage = ({
  initialFilter = 'active',
  orders,
}: OrdersPageProps) => {
  const [selectedFilter, setSelectedFilter] = useState<DeliveryOrderFilterId>(initialFilter);
  const activeOrders = useMemo(() => getActiveDeliveryOrders(orders), [orders]);
  const completedOrders = useMemo(() => getCompletedDeliveryOrders(orders), [orders]);

  useEffect(() => {
    if (selectedFilter === 'active' && activeOrders.length === 0 && completedOrders.length > 0) {
      setSelectedFilter('completed');
      return;
    }

    if (selectedFilter === 'completed' && completedOrders.length === 0 && activeOrders.length > 0) {
      setSelectedFilter('active');
    }
  }, [activeOrders.length, completedOrders.length, selectedFilter]);

  const visibleOrders = selectedFilter === 'active' ? activeOrders : completedOrders;
  const timestampLabel = selectedFilter === 'active' ? 'Assigned' : 'Delivered';

  return (
    <section className="space-y-4">
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_22px_60px_rgba(9,6,5,0.24)]">
        <div className="flex items-center gap-2 text-[#f0b173]">
          <ClipboardList size={16} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">
            Delivery Orders
          </p>
        </div>

        <h2 className="mt-3 text-2xl font-semibold">Assigned and completed deliveries</h2>
        <p className="mt-2 text-sm leading-6 text-[#cdbbaa]">
          Switch between live assignments and delivery history without touching the Firebase layer.
        </p>
      </div>

      <StatusToggle
        label="Order Status"
        onChange={setSelectedFilter}
        options={DELIVERY_ORDER_FILTERS}
        value={selectedFilter}
      />

      <OrderList
        emptyMessage={
          selectedFilter === 'active'
            ? 'No active deliveries are assigned right now.'
            : 'No completed deliveries in history yet.'
        }
        getTimestampValue={order => formatDateTime(getDeliveryEventTimestamp(order))}
        orders={visibleOrders}
        showAddress
        timestampLabel={timestampLabel}
      />
    </section>
  );
};

export default OrdersPage;
