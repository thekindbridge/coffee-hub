import type { LucideIcon } from 'lucide-react';

type NavigationItem<TItem extends string> = {
  icon: LucideIcon;
  id: TItem;
  label: string;
};

type BottomNavigationProps<TItem extends string> = {
  activeId: TItem;
  items: Array<NavigationItem<TItem>>;
  onChange: (id: TItem) => void;
};

export const BottomNavigation = <TItem extends string>({
  activeId,
  items,
  onChange,
}: BottomNavigationProps<TItem>) => (
  <nav className="app-bottom-nav-shell fixed bottom-0 left-0 right-0 z-50 px-4 pt-2.5 backdrop-blur-2xl sm:px-6">
    <div
      className={`app-bottom-nav-card mx-auto grid max-w-screen-md gap-2 rounded-[24px] p-2 ${
        items.length === 2 ? 'grid-cols-2' : 'grid-cols-4'
      }`}
    >
      {items.map(item => {
        const isActive = activeId === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`coffee-nav-pill ${isActive ? 'coffee-nav-pill-active' : 'hover:bg-white/5 hover:text-accent'}`}
          >
            <item.icon size={items.length === 2 ? 18 : 20} strokeWidth={isActive ? 2.4 : 2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
