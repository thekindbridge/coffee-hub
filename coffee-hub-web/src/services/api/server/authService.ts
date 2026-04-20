import type { VercelRequest } from '@vercel/node';

import {
  createFirebaseCustomToken,
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

export const userHasAdminAccess = async (email: string) =>
  hasAdminAccess(email);

export const createFirebaseSessionToken = async (
  userId: string,
  email: string,
) => createFirebaseCustomToken(userId, email);
