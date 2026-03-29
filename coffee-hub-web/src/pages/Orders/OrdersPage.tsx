import { OrdersOverview } from './components/OrdersOverview';
import type { OrdersPageProps } from './OrdersPage.types';

export const OrdersPage = ({
  isLoading,
  orders,
  onBrowseMenu,
  onCancelOrder,
  onTrackOrder,
}: OrdersPageProps) => (
  <OrdersOverview
    isLoading={isLoading}
    orders={orders}
    onBrowseMenu={onBrowseMenu}
    onCancelOrder={onCancelOrder}
    onTrackOrder={onTrackOrder}
  />
);
