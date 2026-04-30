import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { MenuItem } from '../../../types';
import { MenuItemCard } from '../../../features/customer/components/MenuItemCard';
import { MenuSkeletonCard } from '../../../features/customer/components/MenuSkeletonCard';

const MENU_PAGE_SIZE = 8;

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
  const [visibleCount, setVisibleCount] = useState(MENU_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(MENU_PAGE_SIZE);
  }, [filteredMenu]);

  const visibleMenu = useMemo(
    () => filteredMenu.slice(0, visibleCount),
    [filteredMenu, visibleCount],
  );

  const canLoadMore = !isMenuLoading && visibleCount < filteredMenu.length;

  useEffect(() => {
    if (!canLoadMore || !loadMoreRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      entries => {
        const firstEntry = entries[0];
        if (!firstEntry?.isIntersecting) {
          return;
        }

        setVisibleCount(count => Math.min(count + MENU_PAGE_SIZE, filteredMenu.length));
      },
      { rootMargin: '120px 0px' },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, filteredMenu.length]);

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
    <div className="mt-5 grid grid-cols-2 items-start gap-3 pb-28 sm:gap-4 sm:pb-32">
      {isMenuLoading
        ? [...Array(8)].map((_, index) => <MenuSkeletonCard key={index} />)
        : visibleMenu.map(item => (
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

    {canLoadMore && <div ref={loadMoreRef} className="h-2 w-full" aria-hidden="true" />}

    {!isMenuLoading && filteredMenu.length === 0 && (
      <div className="coffee-surface-soft mt-6 rounded-[26px] px-5 py-10 text-center">
        <Search size={42} className="mx-auto text-ink-muted/40" />
        <p className="mt-4 text-sm font-semibold text-accent">No items available ☕</p>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          Try another search or switch the category chips above.
        </p>
      </div>
    )}
  </>
  );
});
