import type { VercelRequest } from '@vercel/node';

import {
  getAdminDb,
  hasAdminAccess,
  verifyAdminRequest,
  verifyRequestUser,
} from '../../../../api/_lib/firebaseAdmin.js';

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const getServerDb = () => getAdminDb();

export const requireUserRequest = async (
  request: VercelRequest,
  expectedUserId?: string,
) => verifyRequestUser(request, expectedUserId);

export const requireAdminRequest = async (request: VercelRequest) =>
  verifyAdminRequest(request);

export const userHasAdminAccess = async ({
  phone = '',
  uid = '',
}: {
  email?: string;
  phone?: string;
  uid?: string;
}) => hasAdminAccess({ phone, uid });
