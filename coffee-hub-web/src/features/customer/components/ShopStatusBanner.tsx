import { motion } from 'motion/react';
import { Clock3 } from 'lucide-react';
import {
  buildShopClosedBannerMessage,
  formatShopTimingRange,
} from '../../../../shared/shopTiming';

type ShopStatusBannerProps = {
  openTime: string;
  closeTime: string;
};

export const ShopStatusBanner = ({ openTime, closeTime }: ShopStatusBannerProps) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-[24px] border border-[#f4c16e]/24 bg-[linear-gradient(135deg,rgba(244,193,110,0.16),rgba(70,46,28,0.92))] px-4 py-4 text-[#fff2dc] shadow-[0_16px_36px_rgba(38,22,12,0.24)]"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#f4c16e]/18 text-[#ffd48e]">
        <Clock3 size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffd48e]">
          Ordering Update
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-accent">
          {buildShopClosedBannerMessage(openTime, closeTime)}
        </p>
        <p className="mt-2 text-xs leading-5 text-[#f5ddbb]/90">
          Ordering hours: {formatShopTimingRange(openTime, closeTime)}
        </p>
      </div>
    </div>
  </motion.div>
);
