import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { MenuItem } from '../../../types';
import { MenuItemCard } from '../../../features/customer/components/MenuItemCard';
import { MenuSkeletonCard } from '../../../features/customer/components/MenuSkeletonCard';

type QuickPicksSectionProps = {
  cartQuantityById: Map<string, number>;
  isMenuLoading: boolean;
  isShopOpen: boolean;
  menu: MenuItem[];
  onAddToCart: (item: MenuItem, delta: number) => void;
  onOpenMenu: () => void;
  shopAvailabilityMessage: string;
};

export const QuickPicksSection = memo(function QuickPicksSection({
  cartQuantityById,
  isMenuLoading,
  isShopOpen,
  menu,
  onAddToCart,
  onOpenMenu,
  shopAvailabilityMessage,
}: QuickPicksSectionProps) {
  return (
  <div>
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

    <div className="mobile-scroll -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
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
                onAdd={onAddToCart}
                shopAvailabilityMessage={shopAvailabilityMessage}
              />
            </div>
      ))}
    </div>
  </div>
  );
});
