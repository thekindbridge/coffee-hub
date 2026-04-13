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
  <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t border-white/10 bg-background/95 px-2 py-2 backdrop-blur-xl">
    <div className={`mx-auto grid w-full max-w-4xl gap-2 ${items.length > 3 ? 'grid-cols-4' : 'grid-cols-2'}`}>
      {items.map(item => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-[10px] font-black uppercase tracking-wide transition-colors ${
              item.id === activeView
                ? 'bg-primary text-white'
                : 'bg-white/5 text-ink-muted'
            }`}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <Icon size={18} />
            <span className="mt-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
