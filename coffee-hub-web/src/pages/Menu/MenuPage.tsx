import { MenuToolbar } from './components/MenuToolbar';
import { MenuCatalog } from './components/MenuCatalog';
import type { MenuPageProps } from './MenuPage.types';

export const MenuPage = ({
  cartQuantityById,
  categories,
  filteredMenu,
  hasStatusBanner,
  isMenuLoading,
  isShopOpen,
  menuError,
  onAddToCart,
  onCategoryChange,
  onOpenCart,
  onRemoveFromCart,
  onRetryMenu,
  onSearchChange,
  searchQuery,
  selectedCategory,
  shopAvailabilityMessage,
}: MenuPageProps) => (
  <div
    id="menu-section"
    className={`px-4 pb-28 sm:px-6 ${
      hasStatusBanner ? 'pt-2 sm:pt-3' : 'pt-20'
    }`}
  >
    <div className="mx-auto max-w-screen-md">
      <MenuToolbar
        categories={categories}
        onCategoryChange={onCategoryChange}
        onSearchChange={onSearchChange}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
      />

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Menu board</p>
          <h2 className="mt-1 text-[1.35rem] font-semibold text-accent">
            {selectedCategory === 'All' ? 'Everything fresh today' : selectedCategory}
          </h2>
        </div>
        <span className="coffee-badge">{isMenuLoading ? 'Loading...' : `${filteredMenu.length} items`}</span>
      </div>

      <MenuCatalog
        cartQuantityById={cartQuantityById}
        filteredMenu={filteredMenu}
        menuError={menuError}
        isMenuLoading={isMenuLoading}
        isShopOpen={isShopOpen}
        onAddToCart={onAddToCart}
        onOpenCart={onOpenCart}
        onRemoveFromCart={onRemoveFromCart}
        onRetryMenu={onRetryMenu}
        shopAvailabilityMessage={shopAvailabilityMessage}
      />
    </div>
  </div>
);
