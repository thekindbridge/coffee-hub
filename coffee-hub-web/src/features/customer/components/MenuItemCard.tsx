import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Coffee, Flame, Leaf, Minus, Plus } from 'lucide-react';
import { CURRENCY_SYMBOL } from '../../app/lib/constants';
import type { MenuItem } from '../../../types';

type MenuItemCardProps = {
  item: MenuItem;
  cartQuantity: number;
  isShopOpen: boolean;
  shopAvailabilityMessage: string;
  onAdd: (item: MenuItem, delta: number) => void;
};
export const MenuItemCard = memo(function MenuItemCard({
  item,
  cartQuantity,
  isShopOpen,
  shopAvailabilityMessage,
  onAdd,
}: MenuItemCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  const optimizedImageUrl = useMemo(() => {
    const imageUrl = item.image_url.trim();
    if (!imageUrl) {
      return '';
    }

    if (!imageUrl.includes('res.cloudinary.com')) {
      return imageUrl;
    }

    return imageUrl.replace('/upload/', '/upload/f_auto,q_auto:eco,w_420,c_fill,ar_4:3/');
  }, [item.image_url]);

  useEffect(() => {
    setIsImageLoaded(false);
    setHasImageError(false);
  }, [optimizedImageUrl]);

  const handleAddOne = useCallback(() => {
    onAdd(item, 1);
  }, [item, onAdd]);

  const handleRemoveOne = useCallback(() => {
    onAdd(item, -1);
  }, [item, onAdd]);

  return (
  <motion.article
    whileHover={isShopOpen ? { y: -3, scale: 1.01 } : undefined}
    whileTap={isShopOpen ? { scale: 0.985 } : undefined}
    className={`coffee-surface group flex h-full flex-col overflow-hidden rounded-[22px] ${
      isShopOpen ? '' : 'border-[#f4c16e]/12'
    }`}
    style={{ containIntrinsicSize: '348px', contentVisibility: 'auto' }}
  >
    <div className="relative aspect-[4/3] overflow-hidden">
      {!isImageLoaded && !hasImageError && optimizedImageUrl && (
        <div className="coffee-skeleton absolute inset-0 flex items-center justify-center animate-pulse" aria-hidden="true">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted/70">
            Loading...
          </span>
        </div>
      )}
      {!hasImageError && optimizedImageUrl ? (
        <img
          src={optimizedImageUrl}
          alt={item.name}
          className={`h-full w-full object-cover transition-all duration-500 ${
            isShopOpen ? 'group-hover:scale-105' : 'scale-[1.02] blur-[1.5px] brightness-[0.55]'
          } ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          referrerPolicy="no-referrer"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
          onError={() => {
            setHasImageError(true);
            setIsImageLoaded(true);
          }}
          onLoad={() => setIsImageLoaded(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_top,rgba(255,179,71,0.22),transparent_52%),linear-gradient(180deg,#211713_0%,#120d0b_100%)] text-accent">
          <Coffee size={26} className="text-secondary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
            Freshly brewing
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0907]/80 via-[#0d0907]/8 to-transparent" />
      <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#120d0b]/82 px-2 py-1 text-[10px] font-semibold text-accent shadow-lg backdrop-blur-md">
        {item.is_veg ? <Leaf size={12} className="text-emerald-400" /> : <Flame size={12} className="text-rose-300" />}
        <span>{item.is_veg ? 'Veg' : 'Non-veg'}</span>
      </div>
      {!isShopOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,rgba(15,11,9,0.18),rgba(15,11,9,0.46))]">
          <div className="rounded-full border border-[#f4c16e]/30 bg-[rgba(59,37,22,0.82)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffd48e]">
            Closed
          </div>
        </div>
      )}
    </div>

    <div className="flex flex-1 flex-col justify-between gap-3 p-3">
      <div>
        <h3 className="line-clamp-2 min-h-[2.2rem] font-display text-[13px] font-semibold leading-[1.35] tracking-[0.01em] text-accent">
          {item.name}
        </h3>
      </div>

      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#fffaf6]">
            <Coffee size={14} className="text-secondary" />
            <span>{CURRENCY_SYMBOL}{item.price}</span>
          </div>
        </div>

        {cartQuantity > 0 ? (
          <>
            <div className="flex items-center justify-between gap-2 rounded-[14px] border border-white/10 bg-[#120d0b]/92 p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
              <button
                onClick={handleRemoveOne}
                className="coffee-icon-btn h-8 w-8 rounded-full border-none bg-white/6"
              >
                <Minus size={15} />
              </button>
              <span className="min-w-5 text-center text-sm font-semibold text-accent">{cartQuantity}</span>
              <button
                onClick={handleAddOne}
                disabled={!isShopOpen}
                className="coffee-icon-btn h-8 w-8 rounded-full border-none bg-primary text-white hover:text-white disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-white/45"
              >
                <Plus size={15} />
              </button>
            </div>

            {!isShopOpen && (
              <p className="text-[11px] font-medium text-[#f4c16e]">
                {shopAvailabilityMessage}
              </p>
            )}
          </>
        ) : (
          <div>
            <button
              onClick={handleAddOne}
              disabled={!isShopOpen}
              className="coffee-btn-primary w-full min-w-0 px-3 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Plus size={15} />
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
});
