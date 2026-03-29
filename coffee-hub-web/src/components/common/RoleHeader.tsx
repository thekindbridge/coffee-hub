import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { User } from 'lucide-react';

type RoleHeaderProps = {
  eyebrow: string;
  icon: LucideIcon;
  onBrandClick?: () => void;
  onProfileClick: () => void;
  rightSlot?: ReactNode;
  title: string;
};

export const RoleHeader = ({
  eyebrow,
  icon: Icon,
  onBrandClick,
  onProfileClick,
  rightSlot,
  title,
}: RoleHeaderProps) => {
  const BrandTag = onBrandClick ? 'button' : 'div';

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/6 bg-[#120d0b]/78 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3">
        <BrandTag
          {...(onBrandClick ? { onClick: onBrandClick } : {})}
          className={`flex items-center gap-3 ${onBrandClick ? 'text-left' : ''}`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8b6145,#4e3427)] shadow-[0_14px_30px_rgba(62,39,35,0.32)]">
            <Icon className="text-accent" size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-secondary">{eyebrow}</p>
            <p className="mt-1 text-sm font-semibold text-accent">{title}</p>
          </div>
        </BrandTag>

        <div className="flex items-center gap-2">
          {rightSlot}
          <button onClick={onProfileClick} className="coffee-icon-btn" aria-label="Profile">
            <User size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
