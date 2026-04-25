import { Suspense, useEffect } from 'react';
import { Loader } from '../../components/ui/Loader';
import { lazyNamed } from '../../utils/lazyNamed';
import type { CustomerShellProps, ShellSharedProps } from '../shells/types';

type AppRouterProps = CustomerShellProps & ShellSharedProps;

const AdminAppShell = lazyNamed(
  () => import('../shells/AdminAppShell'),
  'AdminAppShell',
);
const AgentAppShell = lazyNamed(
  () => import('../shells/AgentAppShell'),
  'AgentAppShell',
);
const CustomerAppShell = lazyNamed(
  () => import('../shells/CustomerAppShell'),
  'CustomerAppShell',
);

export const AppRouter = (props: AppRouterProps) => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const requestedScope = (searchParams.get('scope') || '').trim().toLowerCase();

    const canAccessAdminRoutes =
      props.session.role === 'owner' || props.session.role === 'admin';
    const canAccessDeliveryRoutes = props.session.role === 'delivery_agent';

    const requiresRedirect =
      (requestedScope === 'admin' && !canAccessAdminRoutes) ||
      (requestedScope === 'delivery' && !canAccessDeliveryRoutes);

    if (!requiresRedirect) {
      return;
    }

    searchParams.delete('scope');
    const nextQuery = searchParams.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
  }, [props.session.role]);

  let Shell = CustomerAppShell;

  if (props.session.role === 'owner' || props.session.role === 'admin') {
    Shell = AdminAppShell;
  } else if (props.session.role === 'delivery_agent') {
    Shell = AgentAppShell;
  }

  return (
    <Suspense fallback={<Loader fullScreen label="Loading your workspace..." />}>
      <Shell {...props} />
    </Suspense>
  );
};
