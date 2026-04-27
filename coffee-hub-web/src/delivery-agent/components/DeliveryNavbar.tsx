import type { LucideIcon } from 'lucide-react';

interface DeliveryNavbarItem<T extends string> {
  icon: LucideIcon;
  id: T;
  label: string;
}

interface DeliveryNavbarProps<T extends string> {
  activeView: T;
  items: readonly DeliveryNavbarItem<T>[];
  onChange: (nextView: T) => void;
}

export const DeliveryNavbar = <T extends string,>({
  activeView,
  items,
  onChange,
}: DeliveryNavbarProps<T>) => (
  <nav className="fixed bottom-4 left-0 right-0 z-[80] px-4">
    <div className={`mx-auto grid w-full max-w-[240px] gap-2 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,20,18,0.96),rgba(16,11,10,0.96))] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl ${items.length === 1 ? 'grid-cols-1' : items.length > 3 ? 'grid-cols-4' : 'grid-cols-2'}`}>
      {items.map(item => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            className={`coffee-nav-pill min-h-14 rounded-[22px] ${
              item.id === activeView
                ? 'coffee-nav-pill-active bg-[linear-gradient(180deg,rgba(192,138,93,0.16),rgba(111,78,55,0.3))] text-accent'
                : 'bg-white/5 text-ink-muted'
            }`}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
