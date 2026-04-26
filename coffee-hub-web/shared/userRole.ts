import { safeNormalizePhoneNumber } from './phone.js';

export const USER_ROLES_COLLECTION = 'user_roles';

export type ManagedUserRole = 'admin' | 'delivery_agent';
export type UserRole = 'owner' | ManagedUserRole | 'customer';
export type StaffUserRole = Exclude<UserRole, 'customer'>;

export const normalizeUserRole = (value: unknown): UserRole => {
  if (value === 'owner' || value === 'admin' || value === 'delivery_agent') {
    return value;
  }

  if (value === 'agent') {
    return 'delivery_agent';
  }

  return 'customer';
};

export const normalizeManagedUserRole = (value: unknown): ManagedUserRole | null => {
  if (value === 'admin' || value === 'delivery_agent') {
    return value;
  }

  if (value === 'agent') {
    return 'delivery_agent';
  }

  return null;
};

export const resolveUserRole = ({
  phone,
  mainAdminPhone,
  storedRole,
}: {
  phone?: string | null;
  mainAdminPhone?: string | null;
  storedRole?: unknown;
}): UserRole => {
  const normalizedPhone = safeNormalizePhoneNumber(phone || '');
  const normalizedMainAdminPhone = safeNormalizePhoneNumber(mainAdminPhone || '');

  if (normalizedPhone && normalizedMainAdminPhone && normalizedPhone === normalizedMainAdminPhone) {
    return 'owner';
  }

  const managedRole = normalizeManagedUserRole(storedRole);
  if (managedRole) {
    return managedRole;
  }

  return 'customer';
};

export const isOwnerRole = (role: UserRole) => role === 'owner';

export const isDeliveryAgentRole = (role: UserRole) => role === 'delivery_agent';

export const canAccessAdminPanel = (role: UserRole) =>
  role === 'owner' || role === 'admin';

export const canManageRoles = (role: UserRole) => role === 'owner';
