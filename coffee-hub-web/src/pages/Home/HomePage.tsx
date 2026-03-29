import {
  ChefHat,
  Clock,
  Gift,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { HeroBanner } from './components/HeroBanner';
import { OfferSpotlight } from './components/OfferSpotlight';
import { QuickPicksSection } from './components/QuickPicksSection';
import type { HomePageProps } from './HomePage.types';

export const HomePage = ({
  activeOffers,
  cartQuantityById,
  hasStatusBanner,
  isMenuLoading,
  isShopOpen,
  menu,
  onAddToCart,
  onOpenMenu,
  onOpenOffers,
  shopAvailabilityMessage,
}: HomePageProps) => (
  <div className="pb-12 sm:pb-16">
    <HeroBanner
      activeOfferCount={activeOffers.length}
      hasStatusBanner={hasStatusBanner}
      isShopOpen={isShopOpen}
      menuCount={menu.length}
      onOpenMenu={onOpenMenu}
      onOpenOffers={onOpenOffers}
    />

    <OfferSpotlight offer={activeOffers[0] || null} />

    <section className="px-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-screen-md space-y-4">
        <QuickPicksSection
          cartQuantityById={cartQuantityById}
          isMenuLoading={isMenuLoading}
          isShopOpen={isShopOpen}
          menu={menu}
          onAddToCart={onAddToCart}
          onOpenMenu={onOpenMenu}
          shopAvailabilityMessage={shopAvailabilityMessage}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="coffee-surface-soft rounded-[24px] px-4 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/25 text-secondary">
              <Clock size={20} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-accent">Fast lanes</h3>
            <p className="mt-1 text-xs leading-5 text-ink-muted">Compact checkout built for quick repeat orders on the web.</p>
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
