import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';

import { ApiError } from './errors.js';

let cachedAdminApp: App | null = null;
let cachedAdminAuth: Auth | null = null;
let cachedAdminDb: Firestore | null = null;

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
        process.env.VITE_FIREBASE_PROJECT_ID || '',
      ]),
      clientEmail: getRequiredEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
      privateKey: normalizePrivateKey(getRequiredEnv('FIREBASE_ADMIN_PRIVATE_KEY')),
    }),
  });

  return cachedAdminApp;
};

const getAdminAuth = () => {
  if (!cachedAdminAuth) {
    cachedAdminAuth = getAuth(getAdminApp());
  }

  return cachedAdminAuth;
};

export const getAdminDb = () => {
  if (!cachedAdminDb) {
    cachedAdminDb = getFirestore(getAdminApp());
  }

  return cachedAdminDb;
};

const getBearerToken = (request: VercelRequest) => {
  const authorizationHeader = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing Firebase authentication token.');
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

export const verifyRequestUser = async (
  request: VercelRequest,
  expectedUserId?: string,
): Promise<DecodedIdToken> => {
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(getBearerToken(request));
    if (expectedUserId && decodedToken.uid !== expectedUserId) {
      throw new ApiError(403, 'Authenticated user does not match the order owner.');
    }

    return decodedToken;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('Firebase Admin token verification failed', error);
    throw new ApiError(401, 'Invalid Firebase authentication token.');
  }
};
