import { memo } from 'react';
import { Search } from 'lucide-react';
import type { MenuItem } from '../../../types';
import { MenuItemCard } from '../../../features/customer/components/MenuItemCard';
import { MenuSkeletonCard } from '../../../features/customer/components/MenuSkeletonCard';

type MenuCatalogProps = {
  cartQuantityById: Map<string, number>;
  filteredMenu: MenuItem[];
  isMenuLoading: boolean;
  isShopOpen: boolean;
  menuError: string;
  onAddToCart: (item: MenuItem, delta: number) => void;
  onRetryMenu: () => void;
  shopAvailabilityMessage: string;
};

export const MenuCatalog = memo(function MenuCatalog({
  cartQuantityById,
  filteredMenu,
  isMenuLoading,
  isShopOpen,
  menuError,
  onAddToCart,
  onRetryMenu,
  shopAvailabilityMessage,
}: MenuCatalogProps) {
  if (!isMenuLoading && menuError) {
    return (
      <div className="coffee-surface-soft mt-6 rounded-[26px] px-5 py-10 text-center">
        <Search size={42} className="mx-auto text-rose-300/70" />
        <p className="mt-4 text-sm font-semibold text-accent">Something went wrong. Try again</p>
        <p className="mt-2 text-xs leading-5 text-ink-muted">{menuError}</p>
        <button type="button" onClick={onRetryMenu} className="coffee-btn-primary mt-5">
          Retry
        </button>
      </div>
    );
  }

  return (
  <>
    <div className="mt-5 grid grid-cols-1 gap-4 pb-28 sm:grid-cols-2 sm:pb-32 lg:grid-cols-3">
      {isMenuLoading
        ? [...Array(6)].map((_, index) => <MenuSkeletonCard key={index} />)
        : filteredMenu.map(item => (
            <MenuItemCard
              key={item.id}
              item={item}
              cartQuantity={cartQuantityById.get(item.id) || 0}
              isShopOpen={isShopOpen}
              onAdd={onAddToCart}
              shopAvailabilityMessage={shopAvailabilityMessage}
            />
          ))}
    </div>

    {!isMenuLoading && filteredMenu.length === 0 && (
      <div className="coffee-surface-soft mt-6 rounded-[26px] px-5 py-10 text-center">
        <Search size={42} className="mx-auto text-ink-muted/40" />
        <p className="mt-4 text-sm font-semibold text-accent">Nothing here yet ☕</p>
        <p className="mt-2 text-xs leading-5 text-ink-muted">Try a different keyword or switch the category chip above.</p>
      </div>
    )}
  </>
  );
});
