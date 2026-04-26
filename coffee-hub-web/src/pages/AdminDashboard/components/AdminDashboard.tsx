import { Suspense, lazy, useMemo, useState } from 'react';
import { LayoutGrid, Package2, ReceiptText, TicketPercent } from 'lucide-react';
import { normalizeStatus } from '../../../../shared/orderStatus';
import { Loader } from '../../../components/ui/Loader';
import type { DeliveryAgent, Offer, OfferInput, Order, OrderStatusCode } from '../../../types';

const AdminMenuManager = lazy(() => import('./AdminMenuManager'));
const AdminOffersManager = lazy(() => import('./AdminOffersManager'));
const AdminOrders = lazy(() => import('./AdminOrders'));

type AdminSection = 'dashboard' | 'products' | 'orders' | 'promos';

interface AdminDashboardProps {
  orders: Order[];
  offers: Offer[];
  isOrdersLoading: boolean;
  isOffersLoading: boolean;
  offersError: string;
  newOrderDocIds: string[];
  deliveryAgents: DeliveryAgent[];
  onUpdateStatus: (params: {
    orderId: string;
    status: OrderStatusCode;
    rejectionReason?: string;
  }) => Promise<void>;
  onAssignAgent: (orderDocId: string, agentId: string) => Promise<void>;
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
  isOrdersLoading,
  isOffersLoading,
  offersError,
  newOrderDocIds,
  deliveryAgents,
  onUpdateStatus,
  onAssignAgent,
  onCreateOffer,
  onUpdateOffer,
  onDeleteOffer,
  onToggleOfferStatus,
}: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  const orderCounts = useMemo(() => {
    const counts = {
      outForDelivery: 0,
      waiting: 0,
      preparing: 0,
      rejected: 0,
    };

    orders.forEach(order => {
      switch (normalizeStatus(order.status_code)) {
        case 'WAITING':
          counts.waiting += 1;
          break;
        case 'PREPARING':
          counts.preparing += 1;
          break;
        case 'OUT_FOR_DELIVERY':
          counts.outForDelivery += 1;
          break;
        case 'REJECTED':
          counts.rejected += 1;
          break;
        default:
          break;
      }
    });

    return counts;
  }, [orders]);

  const sectionFallback = <Loader label="Loading admin section..." minHeightClassName="min-h-[320px]" />;

  return (
    <div className="px-4 pb-28 pt-24 sm:px-6">
      <div className="mx-auto max-w-screen-md space-y-5">
        {activeSection === 'dashboard' && (
          <section className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">COFFEE-HUB admin</p>
              <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">Operations overview</h2>
            </div>
            {isOrdersLoading ? (
              <Loader label="Loading admin dashboard..." minHeightClassName="min-h-[220px]" />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {renderCountCard('Pending', orderCounts.waiting, ReceiptText)}
                {renderCountCard('Preparing', orderCounts.preparing, Package2)}
                {renderCountCard('Out for Delivery', orderCounts.outForDelivery, LayoutGrid)}
                {renderCountCard('Rejected', orderCounts.rejected, ReceiptText)}
              </div>
            )}
            <div className="coffee-surface-soft rounded-[24px] p-4 text-sm text-ink-muted">
              <p className="font-semibold text-accent">{newOrderDocIds.length} new order alert{newOrderDocIds.length === 1 ? '' : 's'}</p>
              <p className="mt-2 leading-6">
                Keep menu, promos, and order status updates compact and quick for staff operations.
              </p>
            </div>
          </section>
        )}

        {activeSection === 'products' && (
          <Suspense fallback={sectionFallback}>
            <AdminMenuManager />
          </Suspense>
        )}

        {activeSection === 'orders' && (
          <Suspense fallback={sectionFallback}>
            {isOrdersLoading ? (
              <Loader label="Loading orders..." minHeightClassName="min-h-[320px]" />
            ) : (
              <AdminOrders
                orders={orders}
                newOrderDocIds={newOrderDocIds}
                deliveryAgents={deliveryAgents}
                onAssignAgent={onAssignAgent}
                onUpdateStatus={onUpdateStatus}
              />
            )}
          </Suspense>
        )}

        {activeSection === 'promos' && (
          <Suspense fallback={sectionFallback}>
            <AdminOffersManager
              offers={offers}
              isLoading={isOffersLoading}
              managerError={offersError}
              onCreateOffer={onCreateOffer}
              onUpdateOffer={onUpdateOffer}
              onDeleteOffer={onDeleteOffer}
              onToggleOfferStatus={onToggleOfferStatus}
            />
          </Suspense>
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
