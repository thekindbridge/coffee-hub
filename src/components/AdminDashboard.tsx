import { useMemo, useState } from 'react';
import { LayoutGrid, Package2, ReceiptText, TicketPercent } from 'lucide-react';
import type { Offer, OfferInput, Order } from '../types';
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
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'products', label: 'Products', icon: Package2 },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'promos', label: 'Promos', icon: TicketPercent },
];

const renderCountCard = (title: string, count: number) => (
  <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{title}</p>
    <p className="mt-3 text-5xl font-black leading-none">{count}</p>
  </article>
);

export default function AdminDashboard({
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
      {activeSection === 'dashboard' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black">Dashboard</h2>
          {renderCountCard('Pending Orders', pendingCount)}
          {renderCountCard('Preparing Orders', preparingCount)}
          {renderCountCard('Out for Delivery', outForDeliveryCount)}
        </div>
      )}

      {activeSection === 'products' && <AdminMenuManager />}

      {activeSection === 'orders' && (
        <AdminOrders
          orders={orders}
          newOrderDocIds={newOrderDocIds}
          orderStatuses={orderStatuses}
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

      <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t border-white/10 bg-background/95 px-2 py-2 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-4 gap-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-[10px] font-black uppercase tracking-wide transition-colors ${
                activeSection === item.id
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-ink-muted'
              }`}
            >
              <item.icon size={18} />
              <span className="mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
