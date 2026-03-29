import { memo } from 'react';
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
  return (
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
  );
});
