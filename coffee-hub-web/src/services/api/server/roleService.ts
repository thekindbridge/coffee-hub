import type { Firestore } from 'firebase-admin/firestore';
import { safeNormalizePhoneNumber } from '../../../../shared/phone.js';
import {
  canAccessAdminPanel,
  isDeliveryAgentRole,
  normalizeManagedUserRole,
  resolveUserRole,
  type ManagedUserRole,
  type UserRole,
  USER_ROLES_COLLECTION,
} from '../../../../shared/userRole.js';

const MAIN_ADMIN_PHONE = safeNormalizePhoneNumber(
  process.env.MAIN_ADMIN_PHONE ||
  process.env.VITE_MAIN_ADMIN_PHONE ||
  '',
);

export const getMainAdminPhone = () => MAIN_ADMIN_PHONE;

export const getStoredManagedUserRole = async (
  adminDb: Firestore,
  phone: string,
): Promise<ManagedUserRole | null> => {
  const normalizedPhone = safeNormalizePhoneNumber(phone);
  if (!normalizedPhone || (MAIN_ADMIN_PHONE && normalizedPhone === MAIN_ADMIN_PHONE)) {
    return null;
  }

  const snapshot = await adminDb.collection(USER_ROLES_COLLECTION).doc(normalizedPhone).get();
  return normalizeManagedUserRole(snapshot.data()?.role);
};

export const getUserRole = async (
  adminDb: Firestore,
  phone: string,
): Promise<UserRole> => {
  const normalizedPhone = safeNormalizePhoneNumber(phone);
  if (!normalizedPhone) {
    return 'customer';
  }

  if (MAIN_ADMIN_PHONE && normalizedPhone === MAIN_ADMIN_PHONE) {
    return 'owner';
  }

  const storedRole = await getStoredManagedUserRole(adminDb, normalizedPhone);
  return resolveUserRole({
    phone: normalizedPhone,
    mainAdminPhone: MAIN_ADMIN_PHONE,
    storedRole,
  });
};

export const hasAdminPanelAccess = async (
  adminDb: Firestore,
  phone: string,
) => canAccessAdminPanel(await getUserRole(adminDb, phone));

export const hasDeliveryAgentRole = async (
  adminDb: Firestore,
  phone: string,
) => isDeliveryAgentRole(await getUserRole(adminDb, phone));

export const getRoleAssignmentPhones = async (
  adminDb: Firestore,
  role: ManagedUserRole,
) => {
  const snapshot = await adminDb
    .collection(USER_ROLES_COLLECTION)
    .where('role', '==', role)
    .get();

  return snapshot.docs
    .map(roleSnapshot => safeNormalizePhoneNumber(roleSnapshot.id))
    .filter(Boolean);
};

export const getAdminPhones = async (adminDb: Firestore) => {
  const phones = new Set<string>();

  if (MAIN_ADMIN_PHONE) {
    phones.add(MAIN_ADMIN_PHONE);
  }

  const adminPhones = await getRoleAssignmentPhones(adminDb, 'admin');
  adminPhones.forEach(phone => phones.add(phone));

  return Array.from(phones);
};
