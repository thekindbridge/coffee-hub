import type { ReactNode } from 'react';
import { AUTH_BACKGROUND_IMAGE } from '../../app/lib/constants';

type AuthShellProps = {
  children: ReactNode;
};

export const AuthShell = ({ children }: AuthShellProps) => (
  <div className="relative isolate min-h-screen overflow-hidden bg-[#120c08] text-[#fffaf5]">
    <div
      className="auth-bg-image absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: AUTH_BACKGROUND_IMAGE }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,214,168,0.2),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(131,76,42,0.32),transparent_34%),linear-gradient(180deg,rgba(17,11,8,0.2),rgba(17,10,7,0.46)_42%,rgba(8,5,4,0.74)_100%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,8,6,0.46),rgba(12,8,6,0.08)_34%,rgba(12,8,6,0.18)_68%,rgba(12,8,6,0.6)_100%)]" />
    <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,244,229,0.9)_1px,transparent_0)] [background-size:22px_22px]" />
    <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-[#b96a2b]/16 blur-[120px]" />
    <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[#ffb366]/10 blur-[140px]" />
    <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </div>
  </div>
);
