import type { FC } from 'react';
import { motion } from 'motion/react';
import { Tag } from 'lucide-react';
import type { Offer } from '../../../types';

type OfferCardProps = {
  offer: Offer;
};

export const OfferCard: FC<OfferCardProps> = ({ offer }) => (
  <motion.div
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
);
