import { Suspense } from 'react';
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
  let Shell = CustomerAppShell;

  if (props.session.isAdmin) {
    Shell = AdminAppShell;
  } else if (props.session.isDeliveryAgent) {
    Shell = AgentAppShell;
  }

  return (
    <Suspense fallback={<Loader fullScreen label="Loading your workspace..." />}>
      <Shell {...props} />
    </Suspense>
  );
};
