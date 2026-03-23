import { motion } from 'motion/react';
import {
  BadgePercent,
  ChevronRight,
  Clock,
  Coffee,
  Gift,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Truck,
  ChefHat,
} from 'lucide-react';
import type { MenuItem, Offer } from '../../../types';
import { MenuItemCard } from '../components/MenuItemCard';
import { MenuSkeletonCard } from '../components/MenuSkeletonCard';

type HomePageProps = {
  menu: MenuItem[];
  activeOffers: Offer[];
  isMenuLoading: boolean;
  cartQuantityById: Map<string, number>;
  hasStatusBanner: boolean;
  isShopOpen: boolean;
  shopAvailabilityMessage: string;
  onAddToCart: (item: MenuItem, delta: number) => void;
  onOpenMenu: () => void;
  onOpenOffers: () => void;
};

export const HomePage = ({
  menu,
  activeOffers,
  isMenuLoading,
  cartQuantityById,
  hasStatusBanner,
  isShopOpen,
  shopAvailabilityMessage,
  onAddToCart,
  onOpenMenu,
  onOpenOffers,
}: HomePageProps) => (
  <div className="pb-12 sm:pb-16">
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
            alt="Coffee HUB hero"
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
                Brewed for mobile ordering
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
              { label: 'Fresh picks', value: `${menu.length}+` },
              { label: 'Rewards', value: activeOffers.length > 0 ? `${activeOffers.length}` : '0' },
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

    {activeOffers[0] && (
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
            <p className="mt-1 truncate text-sm font-semibold text-accent">{activeOffers[0].title}</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{activeOffers[0].description}</p>
          </div>
          <div className="rounded-full border border-white/10 bg-[#130e0c]/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {activeOffers[0].couponCode}
          </div>
        </motion.div>
      </section>
    )}

    <section className="px-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-screen-md space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">Popular right now</p>
            <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">Quick picks</h2>
          </div>
          <button onClick={onOpenMenu} className="coffee-btn-secondary min-h-10 px-3">
            <span>Menu</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
          {isMenuLoading
            ? [...Array(4)].map((_, index) => (
                <div key={index} className="min-w-[228px] max-w-[228px]">
                  <MenuSkeletonCard />
                </div>
              ))
            : menu.slice(0, 6).map(item => (
                <div key={item.id} className="min-w-[228px] max-w-[228px]">
                  <MenuItemCard
                    item={item}
                    cartQuantity={cartQuantityById.get(item.id) || 0}
                    isShopOpen={isShopOpen}
                    shopAvailabilityMessage={shopAvailabilityMessage}
                    onAdd={onAddToCart}
                  />
                </div>
              ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="coffee-surface-soft rounded-[24px] px-4 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/25 text-secondary">
              <Clock size={20} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-accent">Fast lanes</h3>
            <p className="mt-1 text-xs leading-5 text-ink-muted">Compact checkout built for quick repeat orders on mobile.</p>
          </div>
          <div className="coffee-surface-soft rounded-[24px] px-4 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-highlight/12 text-highlight">
              <ShieldCheck size={20} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-accent">Fresh & safe</h3>
            <p className="mt-1 text-xs leading-5 text-ink-muted">Quick COD checkout, clean prep, and order tracking from one drawer.</p>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-secondary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
              Why customers love Coffee Hub
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: '4.5+ Local Rating', icon: Star, tone: 'text-[#ffbf5e] bg-[#2b1a0f]' },
              { label: 'Freshly Prepared Food', icon: ChefHat, tone: 'text-[#f6c18b] bg-[#241510]' },
              { label: 'Fast Delivery in Inkollu', icon: Truck, tone: 'text-[#7dd3fc] bg-[#14202a]' },
              { label: 'Daily Offers & Rewards', icon: Gift, tone: 'text-[#c4b5fd] bg-[#1f1a2f]' },
            ].map(item => (
              <div
                key={item.label}
                className="group flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#120d0b]/80 px-3 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${item.tone}`}>
                  <item.icon size={16} />
                </div>
                <p className="text-xs font-semibold text-[#f5ede3]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(18,12,9,0.92),rgba(12,8,6,0.96))] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
            Serving Inkollu &amp; Nearby Areas
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1a1411] text-secondary">
                <Truck size={16} />
              </div>
              <p className="text-sm font-semibold text-[#f5ede3]">
                Average delivery time: 20-30 minutes
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1a1411] text-secondary">
                <MapPin size={16} />
              </div>
              <p className="text-sm font-semibold text-[#f5ede3]">Inkollu Coffee Kitchen</p>
            </div>
          </div>
          <a
            href="https://maps.app.goo.gl/8B32K8X6Vdhg6VUE6"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[#fff8f2] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    </section>
  </div>
);
