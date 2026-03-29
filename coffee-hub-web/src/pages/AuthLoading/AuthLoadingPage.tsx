import { motion } from 'motion/react';
import { Coffee } from 'lucide-react';
import { AuthShell } from '../../features/customer/components/AuthShell';
import { SteamEffect } from '../../features/customer/components/SteamEffect';

export const AuthLoadingPage = () => (
  <AuthShell>
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative w-full max-w-[430px] overflow-hidden rounded-[32px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,251,247,0.14),rgba(89,50,29,0.14))] px-6 py-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.46)] backdrop-blur-[22px] sm:px-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,224,190,0.16),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
      <div className="relative">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))]">
          <SteamEffect className="-top-9" />
          <Coffee className="coffee-icon-float text-[#ffbf80]" size={26} strokeWidth={1.8} />
        </div>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.38em] text-[#efcfb3]">
          COFFEE HUB
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-[#fff7ee]">
          Preparing your sign-in
        </h2>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#f3ddc5]/72">
          Connecting Firebase authentication and warming up your premium ordering experience.
        </p>
        <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-medium text-[#f8e9d8]/85">
          <span className="h-2 w-2 rounded-full bg-[#ffb15d] animate-pulse" />
          Loading authentication...
        </div>
      </div>
    </motion.section>
  </AuthShell>
);
