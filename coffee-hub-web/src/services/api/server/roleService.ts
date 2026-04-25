import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';
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
import { ApiError } from '../../../../api/_lib/errors.js';
import { getServerDb, requireUserRequest } from './authService.js';
import { jsonResponse, type ApiServiceResponse } from './routeUtils.js';

const MAIN_ADMIN_PHONE_ENV = process.env.MAIN_ADMIN_PHONE || '';
const MAIN_ADMIN_PHONE_VITE_ENV = process.env.VITE_MAIN_ADMIN_PHONE || '';
const MAIN_ADMIN_PHONE = safeNormalizePhoneNumber(MAIN_ADMIN_PHONE_ENV || MAIN_ADMIN_PHONE_VITE_ENV);

if (MAIN_ADMIN_PHONE_ENV && MAIN_ADMIN_PHONE_VITE_ENV) {
  const normalizedPrimary = safeNormalizePhoneNumber(MAIN_ADMIN_PHONE_ENV);
  const normalizedSecondary = safeNormalizePhoneNumber(MAIN_ADMIN_PHONE_VITE_ENV);

  if (
    normalizedPrimary &&
    normalizedSecondary &&
    normalizedPrimary !== normalizedSecondary
  ) {
    console.warn('MAIN_ADMIN_PHONE mismatch detected between MAIN_ADMIN_PHONE and VITE_MAIN_ADMIN_PHONE.');
  }
}

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

  try {
    const storedRole = await getStoredManagedUserRole(adminDb, normalizedPhone);
    return resolveUserRole({
      phone: normalizedPhone,
      mainAdminPhone: MAIN_ADMIN_PHONE,
      storedRole,
    });
  } catch {
    return 'customer';
  }
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

const assertOwnerRoleWriteAccess = (requestPhone: string, tokenPhoneNumber: unknown) => {
  const normalizedTokenPhone = safeNormalizePhoneNumber(
    typeof tokenPhoneNumber === 'string' ? tokenPhoneNumber : '',
  );

  if (!MAIN_ADMIN_PHONE) {
    throw new ApiError(500, 'Owner role management is not configured.');
  }

  if (!normalizedTokenPhone || normalizedTokenPhone !== MAIN_ADMIN_PHONE) {
    throw new ApiError(403, 'Only the owner can manage user roles.');
  }

  if (requestPhone && requestPhone !== normalizedTokenPhone) {
    throw new ApiError(403, 'Authenticated request phone does not match owner identity.');
  }
};

const parseRoleMutationBody = (body: unknown) => {
  const payload = body && typeof body === 'object'
    ? body as Record<string, unknown>
    : {};

  const action = typeof payload.action === 'string' ? payload.action.trim().toLowerCase() : '';
  const phone = safeNormalizePhoneNumber(typeof payload.phone === 'string' ? payload.phone : '');
  const role = normalizeManagedUserRole(payload.role);

  if (!phone) {
    throw new ApiError(400, 'Enter a valid mobile number.');
  }

  if (phone === MAIN_ADMIN_PHONE) {
    throw new ApiError(400, 'The owner account is managed by MAIN_ADMIN_PHONE and cannot be changed.');
  }

  if (action === 'assign') {
    if (!role) {
      throw new ApiError(400, 'Role must be admin or delivery_agent.');
    }

    return { action, phone, role } as const;
  }

  if (action === 'remove') {
    return { action, phone, role: null } as const;
  }

  throw new ApiError(400, 'Unsupported role action.');
};

export const mutateUserRoleResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const verifiedRequest = await requireUserRequest(request);

  assertOwnerRoleWriteAccess(
    safeNormalizePhoneNumber(verifiedRequest.phone || ''),
    verifiedRequest.tokenClaims.phone_number,
  );

  const mutation = parseRoleMutationBody(request.body);
  const adminDb = getServerDb();
  const roleRef = adminDb.collection(USER_ROLES_COLLECTION).doc(mutation.phone);

  if (mutation.action === 'assign') {
    await roleRef.set(
      {
        role: mutation.role,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return jsonResponse(200, { message: 'Role assignment saved.' });
  }

  await roleRef.delete();
  return jsonResponse(200, { message: 'Role assignment removed.' });
};
