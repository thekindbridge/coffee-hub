import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';
import { safeNormalizePhoneNumber } from '../../../../shared/phone.js';
import { normalizeUserRole, type UserRole } from '../../../../shared/userRole.js';

import { ApiError } from '../../../../api/_lib/errors.js';
import {
  getServerDb,
  requireUserRequest,
} from './authService.js';
import { getUserRole } from './roleService.js';
import {
  jsonResponse,
  type ApiServiceResponse,
} from './routeUtils.js';

const DEFAULT_NOTIFICATION_SETTINGS = {
  orderUpdates: true,
  offers: false,
};

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

const mapUserProfileResponse = (
  userId: string,
  data: Record<string, unknown>,
) => {
  const addresses = data.addresses && typeof data.addresses === 'object'
    ? data.addresses as Record<string, unknown>
    : {};

  return {
    adminLocation: typeof data.adminLocation === 'string' ? data.adminLocation : '',
    address: typeof data.address === 'string'
      ? data.address
      : (typeof addresses.address1 === 'string' ? addresses.address1 : ''),
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
    phone: typeof data.phone === 'string' ? safeNormalizePhoneNumber(data.phone) : '',
    profileReminderDisabled: data.profileReminderDisabled === true,
    role: normalizeUserRole(data.role),
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
  const body = getBody(request);
  const bodyPhone = safeNormalizePhoneNumber(
    typeof body.phone === 'string' ? body.phone : '',
  );
  const authPhone = safeNormalizePhoneNumber(requestUser.phone || '') || bodyPhone;

  if (!authPhone) {
    throw new ApiError(400, 'A verified mobile number is required.');
  }

  const adminDb = getServerDb();
  const userRef = adminDb.collection('users').doc(requestUser.uid);
  const userSnapshot = await userRef.get();
  const existingData = userSnapshot.exists
    ? userSnapshot.data() as Record<string, unknown>
    : {};
  const resolvedRole = await getUserRole(adminDb, authPhone);
  const name = getStringBodyValue(body, 'name', 120) ||
    (typeof existingData.name === 'string' ? existingData.name : '');
  const isActive = typeof existingData.isActive === 'boolean'
    ? existingData.isActive
    : true;

  const baseProfile = {
    address: typeof existingData.address === 'string'
      ? existingData.address
      : '',
    uid: requestUser.uid,
    email: typeof existingData.email === 'string' ? existingData.email : '',
    isActive,
    name,
    notificationSettings:
      existingData.notificationSettings && typeof existingData.notificationSettings === 'object'
        ? existingData.notificationSettings
        : DEFAULT_NOTIFICATION_SETTINGS,
    phone: authPhone,
    profileReminderDisabled: existingData.profileReminderDisabled === true,
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
