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
import { hasAdminPanelAccess } from '../../src/services/api/server/roleService.js';

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
let adminInitAttempted = false;

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

  return '';
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

  if (adminInitAttempted) {
    return null;
  }

  adminInitAttempted = true;

  try {
    const existingApp = getApps()[0];
    if (existingApp) {
      cachedAdminApp = existingApp;
      return cachedAdminApp;
    }

    const projectId = getRequiredEnv('FIREBASE_ADMIN_PROJECT_ID', [
      process.env.FIREBASE_PROJECT_ID || '',
      process.env.VITE_PROJECT_ID || '',
      process.env.VITE_FIREBASE_PROJECT_ID || '',
    ]);
    const clientEmail = getRequiredEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
    const privateKey = normalizePrivateKey(getRequiredEnv('FIREBASE_ADMIN_PRIVATE_KEY'));

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials in environment variables.');
    }

    cachedAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    return cachedAdminApp;
  } catch (error) {
    console.error('Firebase Admin init failed', error);
    cachedAdminApp = null;
    return null;
  }
};

export const getAdminDb = () => {
  if (!cachedAdminDb) {
    const adminApp = getAdminApp();
    if (!adminApp) {
      return null;
    }

    cachedAdminDb = getFirestore(adminApp);
  }

  return cachedAdminDb;
};

export const getAdminAuthClient = () => {
  if (!cachedAdminAuth) {
    const adminApp = getAdminApp();
    if (!adminApp) {
      return null;
    }

    cachedAdminAuth = getAdminAuth(adminApp);
  }

  return cachedAdminAuth;
};

export const getAdminMessaging = () => {
  if (!cachedAdminMessaging) {
    const adminApp = getAdminApp();
    if (!adminApp) {
      return null;
    }

    cachedAdminMessaging = getMessaging(adminApp);
  }

  return cachedAdminMessaging;
};

export const isFirebaseAdminReady = () => Boolean(getAdminApp());

export const db = getAdminDb;

const getBearerToken = (request: VercelRequest) => {
  const authorizationHeader = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing authentication token.');
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

const getDecodedTokenPhone = (decodedToken: DecodedIdToken) => safeNormalizePhoneNumber(
  decodedToken.phone_number ||
  (
    typeof (decodedToken as DecodedIdToken & { phone?: unknown }).phone === 'string'
      ? (decodedToken as DecodedIdToken & { phone: string }).phone
      : ''
  ),
);

const resolveRequestPhone = async (
  decodedToken: DecodedIdToken,
  uid: string,
) => {
  const decodedPhone = getDecodedTokenPhone(decodedToken);
  if (decodedPhone) {
    return decodedPhone;
  }

  try {
    const adminAuthClient = getAdminAuthClient();
    if (!adminAuthClient) {
      return '';
    }

    const userRecord = await adminAuthClient.getUser(uid);
    return safeNormalizePhoneNumber(userRecord.phoneNumber || '');
  } catch (error) {
    console.error('Unable to resolve Firebase Auth phone number for request user', error);
    return '';
  }
};

const lookupUserPhoneByUid = async (userId: string) => {
  if (!userId) {
    return '';
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return '';
  }

  const snapshot = await adminDb.collection('users').doc(userId).get();
  const storedPhone = snapshot.data()?.phone;

  return typeof storedPhone === 'string'
    ? safeNormalizePhoneNumber(storedPhone)
    : '';
};

export const hasAdminAccess = async ({
  phone = '',
  uid = '',
}: {
  email?: string;
  phone?: string;
  uid?: string;
}) => {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return false;
  }

  const resolvedPhone = safeNormalizePhoneNumber(phone) || await lookupUserPhoneByUid(uid);
  return Boolean(resolvedPhone && await hasAdminPanelAccess(adminDb, resolvedPhone));
};

export const verifyRequestUser = async (
  request: VercelRequest,
  expectedUserId?: string,
): Promise<VerifiedRequestUser> => {
  const bearerToken = getBearerToken(request);

  try {
    const adminAuthClient = getAdminAuthClient();
    if (!adminAuthClient) {
      throw new ApiError(503, 'Firebase server authentication is temporarily unavailable.');
    }

    const decodedToken = await adminAuthClient.verifyIdToken(bearerToken, true);
    const uid = typeof decodedToken.uid === 'string' ? decodedToken.uid.trim() : '';

    if (!uid) {
      throw new ApiError(401, 'Invalid Firebase authentication token.');
    }

    if (expectedUserId && uid !== expectedUserId) {
      throw new ApiError(403, 'Authenticated user does not match the order owner.');
    }

    return {
      email: normalizeEmail(decodedToken.email || ''),
      phone: await resolveRequestPhone(decodedToken, uid),
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
    phone: decodedToken.phone,
    uid: decodedToken.uid,
  });

  if (!isAdmin) {
    throw new ApiError(403, 'Admin access required.');
  }

  return decodedToken;
};
