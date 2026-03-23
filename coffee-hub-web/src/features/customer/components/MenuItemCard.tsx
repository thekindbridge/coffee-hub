import type { FC } from 'react';
import { motion } from 'motion/react';
import { Coffee, Flame, Leaf, Minus, Plus, Star } from 'lucide-react';
import { CURRENCY_SYMBOL } from '../../app/lib/constants';
import type { MenuItem } from '../../../types';

type MenuItemCardProps = {
  item: MenuItem;
  cartQuantity: number;
  isShopOpen: boolean;
  shopAvailabilityMessage: string;
  onAdd: (item: MenuItem, delta: number) => void;
};

const SpiceMeter = ({ level }: { level: number }) => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, index) => (
      <Flame
        key={index}
        size={14}
        className={index < level ? 'text-primary fill-primary' : 'text-white/20'}
      />
    ))}
  </div>
);

export const MenuItemCard: FC<MenuItemCardProps> = ({
  item,
  cartQuantity,
  isShopOpen,
  shopAvailabilityMessage,
  onAdd,
}) => (
  <motion.article
    layout
    whileHover={isShopOpen ? { y: -4, scale: 1.01 } : undefined}
    whileTap={isShopOpen ? { scale: 0.99 } : undefined}
    className={`coffee-surface group flex h-full flex-col overflow-hidden rounded-[26px] ${
      isShopOpen ? '' : 'border-[#f4c16e]/12'
    }`}
  >
    <div className="relative aspect-[1.06] overflow-hidden">
      <img
        src={item.image_url}
        alt={item.name}
        className={`h-full w-full object-cover transition-transform duration-500 ${
          isShopOpen ? 'group-hover:scale-105' : 'scale-[1.02] blur-[1.5px] brightness-[0.55]'
        }`}
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0907]/92 via-[#0d0907]/10 to-transparent" />
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#120d0b]/82 px-2.5 py-1 text-[11px] font-semibold text-accent shadow-lg backdrop-blur-md">
        {item.is_veg ? <Leaf size={12} className="text-emerald-400" /> : <Flame size={12} className="text-rose-300" />}
        <span>{item.is_veg ? 'Veg' : 'Non-veg'}</span>
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/10 bg-[#201612]/82 px-2.5 py-1 text-[11px] font-semibold text-accent backdrop-blur-md">
        <Star size={12} className="fill-current text-highlight" />
        <span>{item.rating.toFixed(1)}</span>
      </div>
      {!isShopOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,rgba(15,11,9,0.18),rgba(15,11,9,0.46))]">
          <div className="rounded-full border border-[#f4c16e]/30 bg-[rgba(59,37,22,0.82)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffd48e]">
            Closed
          </div>
        </div>
      )}
    </div>

    <div className="flex flex-1 flex-col gap-3 p-3.5">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[15px] font-semibold leading-snug tracking-[0.01em] text-accent">
            {item.name}
          </h3>
          <div className="coffee-badge shrink-0">
            <Flame size={12} className="text-highlight" />
            <span>{Math.max(0, item.spice_level)}/5</span>
          </div>
        </div>
        <p className="line-clamp-2 text-[12px] leading-5 text-ink-muted/88">{item.description}</p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#fffaf6]">
            <Coffee size={14} className="text-secondary" />
            <span>{CURRENCY_SYMBOL}{item.price}</span>
          </div>
          <SpiceMeter level={item.spice_level} />
        </div>

        {cartQuantity > 0 ? (
          <div className="min-w-[124px] text-right">
            <div className="flex items-center justify-end gap-2 rounded-full border border-white/10 bg-[#120d0b]/92 p-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
              <button
                onClick={() => onAdd(item, -1)}
                className="coffee-icon-btn h-9 w-9 rounded-full border-none bg-white/6"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-5 text-center text-sm font-semibold text-accent">{cartQuantity}</span>
              <button
                onClick={() => onAdd(item, 1)}
                disabled={!isShopOpen}
                className="coffee-icon-btn h-9 w-9 rounded-full border-none bg-primary text-white hover:text-white disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-white/45"
              >
                <Plus size={16} />
              </button>
            </div>
            {!isShopOpen && (
              <p className="mt-2 text-[11px] font-medium text-[#f4c16e]">
                {shopAvailabilityMessage}
              </p>
            )}
          </div>
        ) : (
          <div className="min-w-[124px] text-right">
            <button
              onClick={() => onAdd(item, 1)}
              disabled={!isShopOpen}
              className="coffee-btn-primary min-w-[108px] px-3.5 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Plus size={16} />
              <span>{isShopOpen ? 'Add' : 'Closed'}</span>
            </button>
            {!isShopOpen && (
              <p className="mt-2 text-[11px] font-medium text-[#f4c16e]">
                {shopAvailabilityMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  </motion.article>
);
