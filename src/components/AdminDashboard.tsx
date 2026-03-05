import { useState } from 'react';
import type { Offer, OfferInput, Order } from '../types';
import AdminMenuManager from './AdminMenuManager';
import AdminOffersManager from './AdminOffersManager';
import AdminOrders from './AdminOrders';

type AdminSection = 'orders' | 'menu' | 'offers';

interface AdminDashboardProps {
  isAdmin: boolean;
  orders: Order[];
  offers: Offer[];
  isOffersLoading: boolean;
  offersError: string;
  newOrderDocIds: string[];
  orderStatuses: Order['status'][];
  onUpdateStatus: (orderDocId: string, status: Order['status']) => void;
  onCreateOffer: (offerInput: OfferInput) => Promise<void>;
  onUpdateOffer: (offerId: string, offerInput: OfferInput) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onToggleOfferStatus: (offerId: string, isActive: boolean) => Promise<void>;
  onLogout: () => void;
}

export default function AdminDashboard({
  isAdmin,
  orders,
  offers,
  isOffersLoading,
  offersError,
  newOrderDocIds,
  orderStatuses,
  onUpdateStatus,
  onCreateOffer,
  onUpdateOffer,
  onDeleteOffer,
  onToggleOfferStatus,
  onLogout,
}: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('orders');

  if (!isAdmin) {
    return (
      <div className="pt-24 pb-24 px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-ink-muted">
          Admin access required.
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-24 pt-24">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-black">Admin Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection('orders')}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              activeSection === 'orders'
                ? 'bg-primary text-white'
                : 'border border-white/10 bg-white/5 text-ink-muted'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveSection('menu')}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              activeSection === 'menu'
                ? 'bg-primary text-white'
                : 'border border-white/10 bg-white/5 text-ink-muted'
            }`}
          >
            Menu Management
          </button>
          <button
            onClick={() => setActiveSection('offers')}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              activeSection === 'offers'
                ? 'bg-primary text-white'
                : 'border border-white/10 bg-white/5 text-ink-muted'
            }`}
          >
            Offers
          </button>
          <button
            onClick={onLogout}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-muted"
          >
            Logout
          </button>
        </div>
      </div>

      {activeSection === 'orders' ? (
        <AdminOrders
          orders={orders}
          newOrderDocIds={newOrderDocIds}
          orderStatuses={orderStatuses}
          onUpdateStatus={onUpdateStatus}
        />
      ) : activeSection === 'menu' ? (
        <AdminMenuManager />
      ) : (
        <AdminOffersManager
          offers={offers}
          isLoading={isOffersLoading}
          managerError={offersError}
          onCreateOffer={onCreateOffer}
          onUpdateOffer={onUpdateOffer}
          onDeleteOffer={onDeleteOffer}
          onToggleOfferStatus={onToggleOfferStatus}
        />
      )}
    </div>
  );
}
