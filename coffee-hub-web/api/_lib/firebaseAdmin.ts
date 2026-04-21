import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { getMessaging } from 'firebase-admin/messaging';
import type { VercelRequest } from '@vercel/node';
import { safeNormalizePhoneNumber } from '../../shared/phone.js';

import { ApiError } from './errors.js';

type VerifiedRequestUser = {
  email?: string;
  phone?: string;
  sessionId: string | null;
  tokenClaims: DecodedIdToken;
  uid: string;
};

let cachedAdminApp: App | null = null;
let cachedAdminDb: Firestore | null = null;
let cachedAdminAuth: Auth | null = null;
let cachedAdminMessaging: Messaging | null = null;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getRequiredEnv = (key: string, fallbacks: string[] = []) => {
  for (const candidate of [process.env[key], ...fallbacks]) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const value = candidate.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`${key} is not configured.`);
};

const normalizePrivateKey = (value: string) => {
  const trimmedValue = value.trim();
  const unwrappedValue =
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
      ? trimmedValue.slice(1, -1)
      : trimmedValue;

  return unwrappedValue.replace(/\\n/g, '\n');
};

const getAdminApp = () => {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  const existingApp = getApps()[0];
  if (existingApp) {
    cachedAdminApp = existingApp;
    return cachedAdminApp;
  }

  cachedAdminApp = initializeApp({
    credential: cert({
      projectId: getRequiredEnv('FIREBASE_ADMIN_PROJECT_ID', [
        process.env.FIREBASE_PROJECT_ID || '',
        process.env.VITE_PROJECT_ID || '',
        process.env.VITE_FIREBASE_PROJECT_ID || '',
      ]),
      clientEmail: getRequiredEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
      privateKey: normalizePrivateKey(getRequiredEnv('FIREBASE_ADMIN_PRIVATE_KEY')),
    }),
  });

  return cachedAdminApp;
};

export const getAdminDb = () => {
  if (!cachedAdminDb) {
    cachedAdminDb = getFirestore(getAdminApp());
  }

  return cachedAdminDb;
};

export const getAdminAuthClient = () => {
  if (!cachedAdminAuth) {
    cachedAdminAuth = getAdminAuth(getAdminApp());
  }

  return cachedAdminAuth;
};

export const getAdminMessaging = () => {
  if (!cachedAdminMessaging) {
    cachedAdminMessaging = getMessaging(getAdminApp());
  }

  return cachedAdminMessaging;
};

const getBearerToken = (request: VercelRequest) => {
  const authorizationHeader = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing Firebase ID token.');
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

const getAuthErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return '';
  }

  return typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : '';
};

const toAuthApiError = (error: unknown) => {
  const message = getAuthErrorMessage(error).toLowerCase();

  if (message.includes('expired')) {
    return new ApiError(401, 'Firebase session expired. Please sign in again.');
  }

  if (message.includes('revoked')) {
    return new ApiError(401, 'This Firebase session is no longer valid. Please sign in again.');
  }

  if (message.includes('project') || message.includes('credential')) {
    return new ApiError(500, 'Firebase server authentication is not configured correctly.');
  }

  return null;
};

const getConfiguredAdminPhone = () =>
  safeNormalizePhoneNumber(process.env.ADMIN_PHONE || process.env.VITE_ADMIN_PHONE || '');

const getConfiguredAdminEmail = () =>
  normalizeEmail(process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '');

const getUserRoleById = async (userId: string) => {
  if (!userId) {
    return '';
  }

  const snapshot = await getAdminDb().collection('users').doc(userId).get();
  const role = snapshot.data()?.role;
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
};

const getUserRoleByPhone = async (phone: string) => {
  const normalizedPhone = safeNormalizePhoneNumber(phone);
  if (!normalizedPhone) {
    return '';
  }

  const snapshot = await getAdminDb()
    .collection('users')
    .where('phone', '==', normalizedPhone)
    .limit(1)
    .get();
  const role = snapshot.docs[0]?.data().role;
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
};

const getUserRoleByEmail = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return '';
  }

  const snapshot = await getAdminDb()
    .collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();
  const role = snapshot.docs[0]?.data().role;
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
};

export const hasAdminAccess = async ({
  email = '',
  phone = '',
  uid = '',
}: {
  email?: string;
  phone?: string;
  uid?: string;
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = safeNormalizePhoneNumber(phone);

  if (uid && (await getUserRoleById(uid)) === 'admin') {
    return true;
  }

  if (normalizedPhone) {
    if (normalizedPhone === getConfiguredAdminPhone()) {
      return true;
    }

    if ((await getUserRoleByPhone(normalizedPhone)) === 'admin') {
      return true;
    }
  }

  if (normalizedEmail) {
    if (normalizedEmail === getConfiguredAdminEmail()) {
      return true;
    }

    if ((await getUserRoleByEmail(normalizedEmail)) === 'admin') {
      return true;
    }
  }

  return false;
};

export const verifyRequestUser = async (
  request: VercelRequest,
  expectedUserId?: string,
): Promise<VerifiedRequestUser> => {
  try {
    const decodedToken = await getAdminAuthClient().verifyIdToken(getBearerToken(request), true);
    const uid = typeof decodedToken.uid === 'string' ? decodedToken.uid.trim() : '';

    if (!uid) {
      throw new ApiError(401, 'Invalid Firebase authentication token.');
    }

    if (expectedUserId && uid !== expectedUserId) {
      throw new ApiError(403, 'Authenticated user does not match the order owner.');
    }

    return {
      email: normalizeEmail(decodedToken.email || ''),
      phone: safeNormalizePhoneNumber(decodedToken.phone_number || ''),
      sessionId: typeof decodedToken.sid === 'string' ? decodedToken.sid : null,
      tokenClaims: decodedToken,
      uid,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const authError = toAuthApiError(error);
    if (authError) {
      throw authError;
    }

    console.error('Firebase token verification failed', error);
    throw new ApiError(401, 'Invalid Firebase authentication token.');
  }
};

export const verifyAdminRequest = async (request: VercelRequest) => {
  const decodedToken = await verifyRequestUser(request);
  const isAdmin = await hasAdminAccess({
    email: decodedToken.email,
    phone: decodedToken.phone,
    uid: decodedToken.uid,
  });

  if (!isAdmin) {
    throw new ApiError(403, 'Admin access required.');
  }

  return decodedToken;
};
