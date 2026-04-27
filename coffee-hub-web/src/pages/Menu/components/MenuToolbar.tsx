import { memo, useEffect, useRef } from 'react';
import { Coffee, Search } from 'lucide-react';

type MenuToolbarProps = {
  categories: string[];
  onCategoryChange: (category: string) => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedCategory: string;
};

export const MenuToolbar = memo(function MenuToolbar({
  categories,
  onCategoryChange,
  onSearchChange,
  searchQuery,
  selectedCategory,
}: MenuToolbarProps) {
  const selectedCategoryButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedCategoryButtonRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedCategory]);

  const categoryCount = Math.max(categories.length - 1, 0);

  return (
  <div className="sticky top-[var(--app-header-sticky-offset)] z-30 rounded-[24px] border border-white/8 bg-[#0f0b09]/90 px-3 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <div className="relative mb-3">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
      <input
        type="text"
        placeholder="Search coffee, snacks, meals..."
        className="coffee-input h-11 pl-11"
        value={searchQuery}
        onChange={event => onSearchChange(event.target.value)}
      />
    </div>

    <div className="mb-2 flex items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
        <Coffee size={13} className="text-secondary" />
        <span>Categories</span>
      </div>
      <span className="rounded-full border border-white/10 bg-white/6 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {categoryCount} section{categoryCount === 1 ? '' : 's'}
      </span>
    </div>

    <div className="mobile-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scroll-smooth snap-x snap-mandatory no-scrollbar">
      {categories.map(category => (
        <button
          key={category}
          ref={selectedCategory === category ? selectedCategoryButtonRef : null}
          type="button"
          onClick={() => onCategoryChange(category)}
          aria-pressed={selectedCategory === category}
          className={`coffee-tab min-h-[38px] shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-[12px] ${
            selectedCategory === category
              ? 'coffee-tab-active'
              : 'border border-white/10 bg-white/5 text-ink-muted hover:bg-white/8'
          }`}
        >
          <span>{category}</span>
        </button>
      ))}
    </div>
  </div>
  );
});
