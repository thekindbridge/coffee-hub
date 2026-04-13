import { motion } from 'motion/react';
import {
  BadgePercent,
  Coffee,
  MapPin,
  ShoppingBag,
} from 'lucide-react';

type HeroBannerProps = {
  activeOfferCount: number;
  hasStatusBanner: boolean;
  isShopOpen: boolean;
  menuCount: number;
  onOpenMenu: () => void;
  onOpenOffers: () => void;
};

export const HeroBanner = ({
  activeOfferCount,
  hasStatusBanner,
  isShopOpen,
  menuCount,
  onOpenMenu,
  onOpenOffers,
}: HeroBannerProps) => (
  <section
    className={`relative overflow-hidden px-4 sm:px-6 ${
      hasStatusBanner ? 'pt-2 sm:pt-3' : 'pt-20'
    }`}
  >
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="coffee-surface relative mx-auto overflow-hidden rounded-[30px] px-5 pb-6 pt-5 sm:max-w-screen-md sm:px-6"
    >
      <div className="absolute inset-0">
        <img
          src="https://res.cloudinary.com/ddfhaqeme/image/upload/v1772699634/e0818545-8027-4b28-8a1f-d521f79fdb6a_plei96.jpg"
          alt="COFFEE-HUB hero"
          className="h-full w-full object-cover opacity-30"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,9,8,0.18),rgba(12,9,8,0.92)_72%)]" />
      </div>

      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <span className="coffee-badge text-accent">
            <Coffee size={12} className="text-secondary" />
            Inkollu coffee kitchen
          </span>
          <span className="coffee-badge">
            <MapPin size={12} />
            Fast local delivery
          </span>
        </div>

        <div className="max-w-[18rem] space-y-3">
          <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-secondary">
                Brewed for quick ordering
              </p>
            <h1 className="font-display text-[2.25rem] font-semibold leading-[0.95] text-accent sm:text-[2.7rem]">
              Hot bowls, rich bites, fast pours.
            </h1>
          </div>
          <p className="text-sm leading-6 text-ink-muted">
            Compact ordering for hungry evenings, quick reorders, and warm coffee-house vibes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onOpenMenu} className={isShopOpen ? 'coffee-btn-primary' : 'coffee-btn-secondary'}>
            <ShoppingBag size={16} />
            <span>{isShopOpen ? 'Order now' : 'Browse menu'}</span>
          </button>
          <button onClick={onOpenOffers} className="coffee-btn-secondary">
            <BadgePercent size={16} />
            <span>Offers</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          {[
            { label: 'Delivery', value: '20-30m' },
            { label: 'Fresh picks', value: `${menuCount}+` },
            { label: 'Rewards', value: activeOfferCount > 0 ? `${activeOfferCount}` : '0' },
          ].map(metric => (
            <div key={metric.label} className="coffee-surface-soft rounded-[20px] px-3 py-3">
              <p className="text-[15px] font-semibold text-accent">{metric.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  </section>
);
