import type { DeliveryAgent, Offer, OfferInput, Order, OrderStatusCode } from '../../types';

export type AdminDashboardPageProps = {
  deliveryAgents: DeliveryAgent[];
  isOrdersLoading: boolean;
  isOffersLoading: boolean;
  newOrderDocIds: string[];
  offers: Offer[];
  offersError: string;
  orders: Order[];
  onAssignAgent: (orderDocId: string, agentId: string) => Promise<void>;
  onCreateOffer: (offerInput: OfferInput) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onToggleOfferStatus: (offerId: string, isActive: boolean) => Promise<void>;
  onUpdateOffer: (offerId: string, offerInput: OfferInput) => Promise<void>;
  onUpdateStatus: (params: {
    orderId: string;
    rejectionReason?: string;
    status: OrderStatusCode;
  }) => Promise<void>;
};
