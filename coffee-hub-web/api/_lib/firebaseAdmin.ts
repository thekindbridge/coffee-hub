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

const getAuthErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return '';
  }

  return typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : '';
};

const getAuthErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return '';
  }

  return typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : '';
};

const toAuthApiError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessage(error);

  if (code === 'auth/id-token-expired') {
    return new ApiError(401, 'Firebase session expired. Please sign in again.');
  }

  if (code === 'auth/id-token-revoked') {
    return new ApiError(401, 'Firebase session was revoked. Please sign in again.');
  }

  if (code === 'auth/argument-error' || code === 'auth/invalid-id-token') {
    return new ApiError(401, 'Firebase authentication token is invalid. Please sign in again.');
  }

  if (
    message.includes('incorrect "aud"') ||
    message.includes('incorrect "iss"') ||
    message.includes('Firebase ID token has incorrect')
  ) {
    return new ApiError(
      500,
      'Firebase project mismatch on the server. Check Vercel Firebase Admin env vars.',
    );
  }

  if (
    message.includes('is not configured') ||
    message.includes('Failed to parse private key') ||
    message.includes('Failed to determine project ID')
  ) {
    return new ApiError(
      500,
      'Firebase Admin is not configured correctly on the server. Check Vercel env vars.',
    );
  }

  return null;
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

    const authError = toAuthApiError(error);
    if (authError) {
      throw authError;
    }

    console.error('Firebase Admin token verification failed', error);
    throw new ApiError(401, 'Invalid Firebase authentication token.');
  }
};
