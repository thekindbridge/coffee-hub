import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';
import { safeNormalizePhoneNumber } from '../../../../shared/phone.js';

import { ApiError } from '../../../../api/_lib/errors.js';
import {
  getServerDb,
  requireUserRequest,
} from './authService.js';
import {
  jsonResponse,
  type ApiServiceResponse,
} from './routeUtils.js';

type UserRole = 'customer' | 'admin' | 'agent';

const DEFAULT_NOTIFICATION_SETTINGS = {
  orderUpdates: true,
  offers: false,
};

const normalize = (value: string) => value.replace(/\s+/g, '');

const normalizePhoneForComparison = (value: string) =>
  safeNormalizePhoneNumber(normalize(value)) || normalize(value).trim();

const getConfiguredAdminPhone = () =>
  normalizePhoneForComparison(process.env.VITE_ADMIN_PHONE || process.env.ADMIN_PHONE || '');

const getConfiguredAgentPhone = () =>
  normalizePhoneForComparison(process.env.VITE_AGENT_PHONE || process.env.AGENT_PHONE || '');

const getBody = (request: VercelRequest) => {
  if (!request.body || typeof request.body !== 'object') {
    return {};
  }

  return request.body as Record<string, unknown>;
};

const getStringBodyValue = (
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
) => {
  const value = typeof body[key] === 'string' ? body[key].trim() : '';
  return value.slice(0, maxLength);
};

const normalizeRole = (value: unknown): UserRole => {
  if (value === 'admin' || value === 'agent') {
    return value;
  }

  return 'customer';
};

const resolveRoleFromPhone = (phone: string): UserRole => {
  const normalizedPhone = normalizePhoneForComparison(phone);
  const adminPhone = getConfiguredAdminPhone();
  const agentPhone = getConfiguredAgentPhone();
  const isAdmin = Boolean(normalizedPhone && adminPhone) && normalizedPhone === adminPhone;
  const isAgent = Boolean(normalizedPhone && agentPhone) && normalizedPhone === agentPhone;
  let role: UserRole;

  if (isAdmin) {
    role = 'admin';
  } else if (isAgent) {
    role = 'agent';
  } else {
    role = 'customer';
  }

  console.log('PHONE:', normalizedPhone);
  console.log('ADMIN_PHONE:', adminPhone);
  console.log('AGENT_PHONE:', agentPhone);
  console.log('ROLE:', role);

  return role;
};

const mapUserProfileResponse = (
  userId: string,
  data: Record<string, unknown>,
) => {
  const addresses = data.addresses && typeof data.addresses === 'object'
    ? data.addresses as Record<string, unknown>
    : {};

  return {
    adminLocation: typeof data.adminLocation === 'string' ? data.adminLocation : '',
    addresses: [
      typeof addresses.address1 === 'string' ? addresses.address1 : '',
      typeof addresses.address2 === 'string' ? addresses.address2 : '',
      typeof addresses.address3 === 'string' ? addresses.address3 : '',
    ],
    email: typeof data.email === 'string' ? data.email : '',
    name: typeof data.name === 'string' ? data.name : '',
    notificationSettings:
      data.notificationSettings && typeof data.notificationSettings === 'object'
        ? data.notificationSettings
        : DEFAULT_NOTIFICATION_SETTINGS,
    phone: typeof data.phone === 'string' ? data.phone : '',
    role: normalizeRole(data.role),
    status: typeof data.status === 'string' && data.status.toLowerCase() === 'offline'
      ? 'Offline'
      : 'Available',
    uid: typeof data.uid === 'string' ? data.uid : userId,
    vehicleType: typeof data.vehicleType === 'string' ? data.vehicleType : '',
  };
};

export const syncUserProfileResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const requestUser = await requireUserRequest(request);
  const authPhone = safeNormalizePhoneNumber(requestUser.phone || '');

  if (!authPhone) {
    throw new ApiError(400, 'A verified mobile number is required.');
  }

  const body = getBody(request);
  const adminDb = getServerDb();
  const userRef = adminDb.collection('users').doc(requestUser.uid);
  const userSnapshot = await userRef.get();
  const existingData = userSnapshot.exists
    ? userSnapshot.data() as Record<string, unknown>
    : {};
  const resolvedRole = resolveRoleFromPhone(authPhone);
  const name = getStringBodyValue(body, 'name', 120) ||
    (typeof existingData.name === 'string' ? existingData.name : '');
  const isActive = typeof existingData.isActive === 'boolean'
    ? existingData.isActive
    : true;

  const baseProfile = {
    uid: requestUser.uid,
    email: typeof existingData.email === 'string' ? existingData.email : '',
    isActive,
    name,
    notificationSettings:
      existingData.notificationSettings && typeof existingData.notificationSettings === 'object'
        ? existingData.notificationSettings
        : DEFAULT_NOTIFICATION_SETTINGS,
    phone: authPhone,
    role: resolvedRole,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await userRef.set(
    userSnapshot.exists
      ? baseProfile
      : {
          ...baseProfile,
          createdAt: FieldValue.serverTimestamp(),
        },
    { merge: true },
  );

  const syncedSnapshot = await userRef.get();
  return jsonResponse(
    200,
    {
      profile: mapUserProfileResponse(
        requestUser.uid,
        syncedSnapshot.data() as Record<string, unknown>,
      ),
    },
    { 'Cache-Control': 'private, no-store' },
  );
};
