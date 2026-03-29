import { motion } from 'motion/react';
import { Tag } from 'lucide-react';
import type { Offer } from '../../../types';

type OfferSpotlightProps = {
  offer: Offer | null;
};

export const OfferSpotlight = ({ offer }: OfferSpotlightProps) => {
  if (!offer) {
    return null;
  }

  return (
    <section className="px-4 pt-4 sm:px-6">
      <motion.div
        whileHover={{ y: -2 }}
        className="mx-auto flex max-w-screen-md items-center gap-3 rounded-[24px] border border-secondary/20 bg-[linear-gradient(135deg,rgba(192,138,93,0.18),rgba(61,41,31,0.96))] px-4 py-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ffcc8a,#ffb347)] text-[#3c2518]">
          <Tag size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Today&apos;s pour</p>
          <p className="mt-1 truncate text-sm font-semibold text-accent">{offer.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{offer.description}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-[#130e0c]/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          {offer.couponCode}
        </div>
      </motion.div>
    </section>
  );
};
