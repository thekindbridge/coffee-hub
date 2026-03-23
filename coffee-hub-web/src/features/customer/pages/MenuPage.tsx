import { Coffee, Search } from 'lucide-react';
import type { MenuItem } from '../../../types';
import { MenuItemCard } from '../components/MenuItemCard';
import { MenuSkeletonCard } from '../components/MenuSkeletonCard';

type MenuPageProps = {
  categories: string[];
  selectedCategory: string;
  searchQuery: string;
  isMenuLoading: boolean;
  filteredMenu: MenuItem[];
  cartQuantityById: Map<string, number>;
  isShopOpen: boolean;
  shopAvailabilityMessage: string;
  onCategoryChange: (category: string) => void;
  onSearchChange: (value: string) => void;
  onAddToCart: (item: MenuItem, delta: number) => void;
};

export const MenuPage = ({
  categories,
  selectedCategory,
  searchQuery,
  isMenuLoading,
  filteredMenu,
  cartQuantityById,
  isShopOpen,
  shopAvailabilityMessage,
  onCategoryChange,
  onSearchChange,
  onAddToCart,
}: MenuPageProps) => (
  <div id="menu-section" className="px-4 pb-28 pt-20 sm:px-6">
    <div className="mx-auto max-w-screen-md">
      <div className="sticky top-[72px] z-30 rounded-[28px] border border-white/8 bg-[#0f0b09]/88 px-3 py-3 backdrop-blur-xl">
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
          <input
            type="text"
            placeholder="Search noodles, rice, drinks..."
            className="coffee-input pl-11"
            value={searchQuery}
            onChange={event => onSearchChange(event.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`coffee-tab whitespace-nowrap ${
                selectedCategory === category
                  ? 'coffee-tab-active'
                  : 'bg-white/5 text-ink-muted hover:bg-white/8'
              }`}
            >
              <Coffee size={13} className={selectedCategory === category ? 'text-highlight' : 'text-secondary'} />
              <span>{category}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Menu board</p>
          <h2 className="mt-1 text-[1.35rem] font-semibold text-accent">
            {selectedCategory === 'All' ? 'Everything fresh today' : selectedCategory}
          </h2>
        </div>
        <span className="coffee-badge">{isMenuLoading ? 'Loading...' : `${filteredMenu.length} items`}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 pb-28 sm:grid-cols-2 sm:pb-32 lg:grid-cols-3">
        {isMenuLoading
          ? [...Array(6)].map((_, index) => <MenuSkeletonCard key={index} />)
          : filteredMenu.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                cartQuantity={cartQuantityById.get(item.id) || 0}
                isShopOpen={isShopOpen}
                shopAvailabilityMessage={shopAvailabilityMessage}
                onAdd={onAddToCart}
              />
            ))}
      </div>

      {!isMenuLoading && filteredMenu.length === 0 && (
        <div className="coffee-surface-soft mt-6 rounded-[26px] px-5 py-10 text-center">
          <Search size={42} className="mx-auto text-ink-muted/40" />
          <p className="mt-4 text-sm font-semibold text-accent">No items match your search</p>
          <p className="mt-2 text-xs leading-5 text-ink-muted">Try a different keyword or switch the category chip above.</p>
        </div>
      )}
    </div>
  </div>
);
