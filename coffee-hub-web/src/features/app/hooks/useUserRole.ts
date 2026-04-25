import { useEffect, useMemo, useState } from 'react';
import { safeNormalizePhoneNumber } from '../../../../shared/phone';
import {
  canAccessAdminPanel,
  canManageRoles,
  isDeliveryAgentRole,
  isOwnerRole,
  resolveUserRole,
  type UserRole,
} from '../../../../shared/userRole';
import {
  getMainAdminPhone,
  subscribeToUserRole,
} from '../../../services/roleService';

type UserRoleState = {
  role: UserRole;
  isAdmin: boolean;
  isDeliveryAgent: boolean;
  isOwner: boolean;
  canAccessAdminPanel: boolean;
  canManageRoles: boolean;
  isRoleReady: boolean;
};

const buildRoleState = (role: UserRole, isRoleReady: boolean): UserRoleState => ({
  role,
  isAdmin: role === 'admin',
  isDeliveryAgent: isDeliveryAgentRole(role),
  isOwner: isOwnerRole(role),
  canAccessAdminPanel: canAccessAdminPanel(role),
  canManageRoles: canManageRoles(role),
  isRoleReady,
});

export const useUserRole = (phone: string): UserRoleState => {
  const normalizedPhone = safeNormalizePhoneNumber(phone);
  const fallbackRole = useMemo(
    () => resolveUserRole({
      phone: normalizedPhone,
      mainAdminPhone: getMainAdminPhone(),
    }),
    [normalizedPhone],
  );
  const [roleState, setRoleState] = useState<UserRoleState>(() =>
    buildRoleState(
      fallbackRole,
      fallbackRole === 'owner' || !normalizedPhone,
    ),
  );

  useEffect(() => {
    setRoleState(buildRoleState(
      fallbackRole,
      fallbackRole === 'owner' || !normalizedPhone,
    ));

    if (!normalizedPhone || fallbackRole === 'owner') {
      return () => undefined;
    }

    return subscribeToUserRole(
      normalizedPhone,
      role => {
        setRoleState(buildRoleState(role, true));
      },
      error => {
        console.error('Failed to subscribe to the current user role', error);
        setRoleState(buildRoleState(fallbackRole, true));
      },
    );
  }, [fallbackRole, normalizedPhone]);

  return roleState;
};
