import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AuthState } from '../../../hooks/useAuth';
import { normalizeEmail } from '../lib/normalizeEmail';
import type { AppUserRole, UserRoleState } from '../types';

const OWNER_EMAIL = normalizeEmail(
  process.env.EXPO_PUBLIC_OWNER_EMAIL || 'coffeehubinkollu@gmail.com',
);

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
  authRole,
  isOwner,
  loading,
}: {
  authRole: 'admin' | 'agent' | 'customer';
  isOwner: boolean;
  loading: boolean;
}): UserRoleState => {
  const role: AppUserRole = authRole === 'admin'
    ? 'admin'
    : authRole === 'agent'
      ? 'delivery'
      : 'customer';

  return {
    isAdmin: role === 'admin',
    isCustomer: role === 'customer',
    isDelivery: role === 'delivery',
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

    if (!auth.user) {
      setRoleState({
        ...DEFAULT_ROLE_STATE,
        loading: false,
      });
      return;
    }

    setRoleState(
      buildRoleState({
        authRole: auth.user.role,
        isOwner: normalizeEmail(auth.currentUserEmail) === OWNER_EMAIL,
        loading: false,
      }),
    );
  }, [auth.currentUserEmail, auth.isAuthReady, auth.user]);

  const value = useMemo(() => roleState, [roleState]);

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}
