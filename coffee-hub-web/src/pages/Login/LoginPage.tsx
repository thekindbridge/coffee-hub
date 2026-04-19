import { motion } from 'motion/react';
import { ArrowRight, Coffee } from 'lucide-react';
import { AuthShell } from '../../features/customer/components/AuthShell';
import { SteamEffect } from '../../features/customer/components/SteamEffect';
import type { LoginPageProps } from './LoginPage.types';

export const LoginPage = ({
  onLogin,
  isLoggingIn = false,
  loginError = '',
}: LoginPageProps) => (
  <AuthShell>
    <motion.section
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-[350px] overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,250,244,0.1),rgba(88,50,28,0.1))] px-5 py-6 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-[12px] sm:max-w-[380px] sm:px-7 sm:py-7"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,224,190,0.14),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative mx-auto mb-6 mt-1 flex h-36 w-36 items-center justify-center rounded-[38px] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,235,212,0.16),rgba(90,51,29,0.08)_72%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_22px_55px_rgba(13,7,4,0.38)] sm:h-40 sm:w-40">
          <SteamEffect className="-top-14 scale-110 sm:-top-16 sm:scale-125" />
          <div className="absolute inset-3 rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
          <Coffee className="coffee-icon-float relative text-[#ffc58b]" size={68} strokeWidth={1.65} />
        </div>

        <h1 className="font-display text-[2.1rem] font-semibold tracking-[0.08em] text-[#fff8f1] sm:text-[2.45rem]">
          COFFEE-HUB
        </h1>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.45em] text-[#f0cfad] sm:text-xs">
          Inkollu
        </p>
        <p className="mt-3 text-sm font-medium text-[#f8e9d8] sm:text-[15px]">
          Fresh Food <span aria-hidden="true">&bull;</span> Fast Delivery
        </p>

        <motion.button
          type="button"
          disabled={isLoggingIn}
          onClick={onLogin}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.985 }}
          className="google-btn group relative mt-7 flex w-full items-center justify-center gap-3 overflow-hidden rounded-[20px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,250,244,0.94),rgba(244,229,211,0.86))] px-4 py-3.5 text-[15px] font-semibold text-[#24140b] shadow-[0_14px_34px_rgba(24,12,6,0.3)] transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(18,8,4,0.34)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:shadow-[0_14px_34px_rgba(24,12,6,0.3)]"
        >
          <span className="pointer-events-none absolute inset-y-0 left-[-35%] w-20 rotate-[18deg] bg-white/30 blur-2xl auth-card-sheen" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-[0_10px_22px_rgba(255,255,255,0.16)]">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 3.6 14.5 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.9-3.7 8.9-8.9 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
          </span>
          <span className="relative">{isLoggingIn ? 'Signing in...' : 'Continue with Google'}</span>
          <ArrowRight size={17} className="relative text-[#8e5327] transition-transform duration-300 group-hover:translate-x-1" />
        </motion.button>

        {loginError && (
          <p className="mt-4 text-sm font-medium text-rose-200">
            {loginError}
          </p>
        )}
      </div>
    </motion.section>
  </AuthShell>
);
