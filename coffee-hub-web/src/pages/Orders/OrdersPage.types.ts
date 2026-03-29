import type { Order } from '../../types';

export type OrdersPageProps = {
  isLoading: boolean;
  orders: Order[];
  onBrowseMenu: () => void;
  onCancelOrder: (order: Order, cancellationReason: string) => Promise<void>;
  onTrackOrder: (order: Order) => void;
};
