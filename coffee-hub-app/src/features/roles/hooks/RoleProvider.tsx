import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AuthState } from '../../../hooks/useAuth';
import { normalizeEmail } from '../lib/normalizeEmail';
import {
  OWNER_EMAIL,
  seedOwnerAdmin,
  subscribeToAdminAccessStatus,
  subscribeToDeliveryAccessStatus,
} from '../services/roleService';
import type { AppUserRole, UserRoleState } from '../types';

const DEFAULT_ROLE_STATE: UserRoleState = {
  isAdmin: false,
  isCustomer: true,
  isDelivery: false,
  isOwner: false,
  loading: true,
  role: 'customer',
};

export const UserRoleContext = createContext<UserRoleState | null>(null);

type RoleProviderProps = PropsWithChildren<{
  auth: AuthState;
}>;

const buildRoleState = ({
  adminAccess,
  deliveryAccess,
  isOwner,
  loading,
}: {
  adminAccess: boolean;
  deliveryAccess: boolean;
  isOwner: boolean;
  loading: boolean;
}): UserRoleState => {
  const isAdmin = isOwner || adminAccess;
  const role: AppUserRole = isAdmin ? 'admin' : deliveryAccess ? 'delivery' : 'customer';

  return {
    isAdmin,
    isCustomer: role === 'customer',
    isDelivery: deliveryAccess,
    isOwner,
    loading,
    role,
  };
};

export function RoleProvider({ auth, children }: RoleProviderProps) {
  const [roleState, setRoleState] = useState<UserRoleState>(DEFAULT_ROLE_STATE);

  useEffect(() => {
    if (!auth.isAuthReady) {
      setRoleState(DEFAULT_ROLE_STATE);
      return;
    }

    const normalizedEmail = normalizeEmail(auth.currentUserEmail);
    if (!auth.user || !normalizedEmail) {
      setRoleState({
        ...DEFAULT_ROLE_STATE,
        loading: false,
      });
      return;
    }

    const isOwner = normalizedEmail === OWNER_EMAIL;
    let hasAdminAccess = false;
    let hasDeliveryAccess = false;
    let hasResolvedAdmin = false;
    let hasResolvedDelivery = false;

    const syncRoleState = () => {
      setRoleState(
        buildRoleState({
          adminAccess: hasAdminAccess,
          deliveryAccess: hasDeliveryAccess,
          isOwner,
          loading: !(hasResolvedAdmin && hasResolvedDelivery),
        }),
      );
    };

    setRoleState(
      buildRoleState({
        adminAccess: false,
        deliveryAccess: false,
        isOwner,
        loading: true,
      }),
    );

    if (isOwner) {
      void seedOwnerAdmin(normalizedEmail).catch(error => {
        console.warn('Unable to seed owner admin access on mobile', error);
      });
    }

    const unsubscribeAdmin = subscribeToAdminAccessStatus(
      normalizedEmail,
      hasAccess => {
        hasResolvedAdmin = true;
        hasAdminAccess = hasAccess;
        syncRoleState();
      },
      error => {
        console.error('Failed to subscribe to admin access', error);
        hasResolvedAdmin = true;
        hasAdminAccess = false;
        syncRoleState();
      },
    );

    const unsubscribeDelivery = subscribeToDeliveryAccessStatus(
      normalizedEmail,
      hasAccess => {
        hasResolvedDelivery = true;
        hasDeliveryAccess = hasAccess;
        syncRoleState();
      },
      error => {
        console.error('Failed to subscribe to delivery access', error);
        hasResolvedDelivery = true;
        hasDeliveryAccess = false;
        syncRoleState();
      },
    );

    return () => {
      unsubscribeAdmin();
      unsubscribeDelivery();
    };
  }, [auth.currentUserEmail, auth.isAuthReady, auth.user]);

  const value = useMemo(() => roleState, [roleState]);

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}
