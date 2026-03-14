import { useMemo, useState } from 'react';
import { LayoutGrid, Package2, ReceiptText, TicketPercent } from 'lucide-react';

import type { DeliveryAgent, Offer, OfferInput, Order } from '../types';
import AdminMenuManager from './AdminMenuManager';
import AdminOffersManager from './AdminOffersManager';
import AdminOrders from './AdminOrders';

type AdminSection = 'dashboard' | 'products' | 'orders' | 'promos';

interface AdminDashboardProps {
  orders: Order[];
  offers: Offer[];
  isOffersLoading: boolean;
  offersError: string;
  newOrderDocIds: string[];
  orderStatuses: Order['status'][];
  deliveryAgents: DeliveryAgent[];
  onUpdateStatus: (orderDocId: string, status: Order['status']) => void;
  onCreateOffer: (offerInput: OfferInput) => Promise<void>;
  onUpdateOffer: (offerId: string, offerInput: OfferInput) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onToggleOfferStatus: (offerId: string, isActive: boolean) => Promise<void>;
}

const NAV_ITEMS: Array<{
  id: AdminSection;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { id: 'products', label: 'Menu', icon: Package2 },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'promos', label: 'Offers', icon: TicketPercent },
];

const renderCountCard = (title: string, count: number, Icon: typeof LayoutGrid) => (
  <article className="coffee-surface-soft rounded-[24px] p-4">
    <div className="flex items-center justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/18 text-secondary">
        <Icon size={18} />
      </div>
      <span className="text-[1.5rem] font-semibold text-accent">{count}</span>
    </div>
    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">{title}</p>
  </article>
);

export default function AdminDashboard({
  orders,
  offers,
  isOffersLoading,
  offersError,
  newOrderDocIds,
  orderStatuses,
  deliveryAgents,
  onUpdateStatus,
  onCreateOffer,
  onUpdateOffer,
  onDeleteOffer,
  onToggleOfferStatus,
}: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  const pendingCount = useMemo(
    () => orders.filter(order => order.status === 'Pending').length,
    [orders],
  );
  const preparingCount = useMemo(
    () => orders.filter(order => order.status === 'Preparing').length,
    [orders],
  );
  const outForDeliveryCount = useMemo(
    () => orders.filter(order => order.status === 'Out for Delivery').length,
    [orders],
  );

  return (
    <div className="px-4 pb-28 pt-24 sm:px-6">
      <div className="mx-auto max-w-screen-md space-y-5">
        {activeSection === 'dashboard' && (
          <section className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">Coffee HUB admin</p>
              <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">Operations overview</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {renderCountCard('Pending', pendingCount, ReceiptText)}
              {renderCountCard('Preparing', preparingCount, Package2)}
              {renderCountCard('Out for Delivery', outForDeliveryCount, LayoutGrid)}
            </div>
            <div className="coffee-surface-soft rounded-[24px] p-4 text-sm text-ink-muted">
              <p className="font-semibold text-accent">{newOrderDocIds.length} new order alert{newOrderDocIds.length === 1 ? '' : 's'}</p>
              <p className="mt-2 leading-6">
                Keep menu, promos, and order status updates compact and quick for mobile staff use.
              </p>
            </div>
          </section>
        )}

        {activeSection === 'products' && <AdminMenuManager />}

        {activeSection === 'orders' && (
          <AdminOrders
            orders={orders}
            newOrderDocIds={newOrderDocIds}
            orderStatuses={orderStatuses}
            deliveryAgents={deliveryAgents}
            onUpdateStatus={onUpdateStatus}
          />
        )}

        {activeSection === 'promos' && (
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

      <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t border-white/8 bg-[#0f0b09]/92 px-4 py-3 backdrop-blur-2xl sm:px-6">
        <div className="mx-auto grid max-w-screen-md grid-cols-4 gap-2 rounded-[24px] border border-white/8 bg-[#120d0b]/88 p-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`coffee-nav-pill ${
                activeSection === item.id ? 'coffee-nav-pill-active' : 'hover:bg-white/5 hover:text-accent'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
