import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';

import { ApiError } from '../../../../api/_lib/errors.js';
import {
  getServerDb,
  normalizeEmail,
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

const getConfiguredAdminEmail = () =>
  normalizeEmail(process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '');

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
    clerkId: typeof data.clerkId === 'string' ? data.clerkId : userId,
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
    vehicleType: typeof data.vehicleType === 'string' ? data.vehicleType : '',
  };
};

export const syncUserProfileResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const requestUser = await requireUserRequest(request);
  const body = getBody(request);
  const authEmail = normalizeEmail(requestUser.email || '');
  const requestedEmail = normalizeEmail(getStringBodyValue(body, 'email', 320));
  const email = authEmail || requestedEmail;

  if (!email) {
    throw new ApiError(400, 'A verified email address is required.');
  }

  const adminDb = getServerDb();
  const userRef = adminDb.collection('users').doc(requestUser.uid);
  const userSnapshot = await userRef.get();
  const existingData = userSnapshot.exists
    ? userSnapshot.data() as Record<string, unknown>
    : {};
  const existingRole = normalizeRole(existingData.role);
  const defaultRole: UserRole =
    !userSnapshot.exists && email === getConfiguredAdminEmail() ? 'admin' : 'customer';
  const name = getStringBodyValue(body, 'name', 120) ||
    (typeof existingData.name === 'string' ? existingData.name : '');

  const baseProfile = {
    clerkId: requestUser.uid,
    email,
    name,
    notificationSettings:
      existingData.notificationSettings && typeof existingData.notificationSettings === 'object'
        ? existingData.notificationSettings
        : DEFAULT_NOTIFICATION_SETTINGS,
    role: userSnapshot.exists ? existingRole : defaultRole,
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
