import { motion } from 'motion/react';
import { Tag } from 'lucide-react';
import type { Offer } from '../../../types';

type OffersPageProps = {
  activeOffers: Offer[];
  isLoading: boolean;
  error: string;
};

export const OffersPage = ({
  activeOffers,
  isLoading,
  error,
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
      activeOffers.map(offer => (
        <motion.div
          key={offer.id}
          whileHover={{ scale: 1.02 }}
          className="relative flex flex-col gap-2 overflow-hidden rounded-3xl border border-accent/20 bg-accent/90 p-4 text-black sm:gap-3 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/15">
                <Tag size={16} />
              </div>
              <h3 className="min-w-0 text-base font-black leading-snug sm:text-lg">{offer.title}</h3>
            </div>
            <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
              {offer.discountType === 'percentage'
                ? `${offer.discountValue}% OFF`
                : `FLAT Rs ${offer.discountValue} OFF`}
            </span>
          </div>
          <p className="text-sm font-bold leading-5 opacity-80">{offer.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-lg bg-black/20 px-3 py-1 text-[11px] font-black uppercase tracking-wide">
              {offer.couponCode}
            </div>
            <button
              type="button"
              className="rounded-lg border border-black/10 bg-black/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide"
            >
              Apply
            </button>
          </div>
        </motion.div>
      ))
    )}
  </div>
);
