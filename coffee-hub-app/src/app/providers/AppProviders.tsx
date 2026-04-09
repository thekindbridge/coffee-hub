import type { PropsWithChildren } from 'react';
import type { AuthState } from '../../hooks/useAuth';
import { DeliveryAgentProvider } from '../../delivery-agent';
import { ProfileProvider } from '../../features/profile/hooks/ProfileProvider';
import { RoleProvider } from '../../features/roles/hooks/RoleProvider';
import { CartProvider } from './CartProvider';

type AppProvidersProps = PropsWithChildren<{
  auth: AuthState;
}>;

export function AppProviders({ auth, children }: AppProvidersProps) {
  return (
    <RoleProvider auth={auth}>
      <DeliveryAgentProvider auth={auth}>
        <ProfileProvider auth={auth}>
          <CartProvider auth={auth}>
            {children}
          </CartProvider>
        </ProfileProvider>
      </DeliveryAgentProvider>
    </RoleProvider>
  );
}
