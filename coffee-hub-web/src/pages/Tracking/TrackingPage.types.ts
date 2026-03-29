import type { Order } from '../../types';

export type TrackingPageProps = {
  isTrackingOrder: boolean;
  onBackToOrders: () => void;
  onClearTracking: () => void;
  onGoToMenu: () => void;
  onTrackOrder: () => void;
  onTrackingOrderIdChange: (value: string) => void;
  orderStatus: Order | null;
  trackingError: string;
  trackingOrderId: string;
};
