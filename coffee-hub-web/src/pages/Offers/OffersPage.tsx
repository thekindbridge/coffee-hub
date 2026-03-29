import { OfferCard } from './components/OfferCard';
import type { OffersPageProps } from './OffersPage.types';

export const OffersPage = ({
  activeOffers,
  error,
  isLoading,
}: OffersPageProps) => (
  <div className="space-y-6 px-6 pb-24 pt-24">
    <h2 className="mb-8 text-3xl font-black">Exclusive Offers</h2>

    {error ? (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-primary">
        {error}
      </div>
    ) : isLoading ? (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-ink-muted">
        Loading offers...
      </div>
    ) : activeOffers.length === 0 ? (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-ink-muted">
        No active offers available right now.
      </div>
    ) : (
      activeOffers.map(offer => <OfferCard key={offer.id} offer={offer} />)
    )}
  </div>
);
