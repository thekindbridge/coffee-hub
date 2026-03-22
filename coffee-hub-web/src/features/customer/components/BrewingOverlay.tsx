import { AnimatePresence, motion } from 'motion/react';
import { Coffee, LoaderCircle, Sparkles } from 'lucide-react';

type BrewingOverlayProps = {
  visible: boolean;
};

export const BrewingOverlay = ({ visible }: BrewingOverlayProps) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0a0705]/82 px-6 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="coffee-surface w-full max-w-[320px] rounded-[30px] p-6 text-center"
        >
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(255,179,71,0.15),rgba(111,78,55,0.12))]">
            <LoaderCircle size={44} className="coffee-loader-ring absolute text-secondary/80" strokeWidth={1.5} />
            <Coffee size={28} className="relative z-10 text-accent" strokeWidth={1.9} />
          </div>
          <div className="mt-5 flex items-center justify-center gap-1.5 text-highlight">
            {[0, 1, 2, 3].map(bean => (
              <span key={bean} className="coffee-bean block h-2.5 w-2.5 rounded-full bg-current" />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
            <Sparkles size={14} />
            Brewing your order
          </div>
          <h3 className="mt-3 font-display text-[1.35rem] font-semibold text-accent">
            Warming up checkout
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Preparing your cart, payment flow, and confirmation in one smooth pour.
          </p>
          <div className="mt-5 overflow-hidden rounded-full border border-white/10 bg-white/6 p-1">
            <motion.div
              initial={{ x: '-55%' }}
              animate={{ x: '140%' }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2 w-24 rounded-full bg-[linear-gradient(90deg,#ffb347,#f5e6d3)]"
            />
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
