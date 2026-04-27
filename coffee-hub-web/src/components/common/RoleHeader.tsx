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
    <header className="app-header-shell sticky left-0 right-0 top-0 z-50 px-4 pb-2.5 backdrop-blur-xl sm:px-6">
      <div className="mx-auto max-w-screen-md">
        <div className="app-header-card flex items-center justify-between gap-3 rounded-[26px] px-3.5 py-2.5">
          <BrandTag
            {...(onBrandClick ? { onClick: onBrandClick } : {})}
            className={`flex items-center gap-3 ${onBrandClick ? 'text-left' : ''}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#8b6145,#4e3427)] shadow-[0_12px_24px_rgba(62,39,35,0.28)]">
              <Icon className="text-accent" size={17} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary">{eyebrow}</p>
              <p className="mt-0.5 text-[13px] font-semibold text-accent sm:text-sm">{title}</p>
            </div>
          </BrandTag>

          <div className="flex items-center gap-1.5">
            {rightSlot}
            <button type="button" onClick={onProfileClick} className="coffee-icon-btn" aria-label="Profile">
              <User size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
