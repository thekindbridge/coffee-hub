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
    <main
      className={`app-shell-main mobile-scroll mx-auto w-full max-w-screen-md ${
        navigation ? 'app-shell-main-with-nav' : ''
      }`}
    >
      {children}
    </main>
    {footer}
    {overlays}
    {navigation}
  </div>
);
