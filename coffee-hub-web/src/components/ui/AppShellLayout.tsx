import type { ReactNode } from 'react';

type AppShellLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  header: ReactNode;
  navigation?: ReactNode;
  overlays?: ReactNode;
};

export const AppShellLayout = ({
  children,
  footer,
  header,
  navigation,
  overlays,
}: AppShellLayoutProps) => (
  <div className="app-shell">
    {header}
    <main className="mobile-scroll mx-auto max-w-screen-md">{children}</main>
    {footer}
    {overlays}
    {navigation}
  </div>
);
