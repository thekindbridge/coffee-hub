import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { getMessaging } from 'firebase-admin/messaging';
import type { VercelRequest } from '@vercel/node';
import { createClerkClient, verifyToken, type ClerkClient } from '@clerk/backend';

import { ApiError } from './errors.js';

type VerifiedRequestUser = {
  admin?: boolean;
  email?: string;
  role?: string;
  roles?: string[];
  sessionId: string | null;
  tokenClaims: Record<string, unknown>;
  uid: string;
};

let cachedAdminApp: App | null = null;
let cachedAdminDb: Firestore | null = null;
let cachedAdminMessaging: Messaging | null = null;
let cachedClerkClient: ClerkClient | null = null;

const DEFAULT_CLERK_AUTHORIZED_PARTIES = [
  'https://coffee-hub-inkollu.vercel.app',
  'http://localhost:5173',
  'http://10.0.2.2:5173',
];

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

const getOptionalEnv = (key: string, fallbacks: string[] = []) => {
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

const getClerkClient = () => {
  if (!cachedClerkClient) {
    cachedClerkClient = createClerkClient({
      publishableKey: getOptionalEnv('CLERK_PUBLISHABLE_KEY', [
        process.env.VITE_CLERK_PUBLISHABLE_KEY || '',
      ]) || undefined,
      secretKey: getRequiredEnv('CLERK_SECRET_KEY'),
    });
  }

  return cachedClerkClient;
};

const getClerkAuthorizedParties = () => {
  const configuredValue = getOptionalEnv('CLERK_AUTHORIZED_PARTIES');
  if (!configuredValue) {
    return DEFAULT_CLERK_AUTHORIZED_PARTIES;
  }

  const values = configuredValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : DEFAULT_CLERK_AUTHORIZED_PARTIES;
};

export const getAdminDb = () => {
  if (!cachedAdminDb) {
    cachedAdminDb = getFirestore(getAdminApp());
  }

  return cachedAdminDb;
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
    throw new ApiError(401, 'Missing Clerk session token.');
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

const getStringClaim = (claims: Record<string, unknown>, key: string) => (
  typeof claims[key] === 'string' ? claims[key] as string : ''
);

const getStringArrayClaim = (claims: Record<string, unknown>, key: string) => (
  Array.isArray(claims[key])
    ? claims[key].filter((value): value is string => typeof value === 'string')
    : []
);

const resolvePrimaryEmail = async (userId: string, tokenClaims: Record<string, unknown>) => {
  const claimEmail = getStringClaim(tokenClaims, 'email');
  if (claimEmail) {
    return normalizeEmail(claimEmail);
  }

  const user = await getClerkClient().users.getUser(userId);
  const primaryEmailAddress = user.primaryEmailAddressId
    ? user.emailAddresses.find(emailAddress => emailAddress.id === user.primaryEmailAddressId)
    : user.emailAddresses[0];

  return normalizeEmail(primaryEmailAddress?.emailAddress || '');
};

const toAuthApiError = (error: unknown) => {
  const message = getAuthErrorMessage(error).toLowerCase();

  if (message.includes('expired')) {
    return new ApiError(401, 'Clerk session expired. Please sign in again.');
  }

  if (message.includes('authorized party') || message.includes('azp')) {
    return new ApiError(401, 'Clerk token origin is not allowed for this application.');
  }

  if (
    message.includes('clerk_secret_key') ||
    message.includes('secret key') ||
    message.includes('jwt key') ||
    message.includes('jwks')
  ) {
    return new ApiError(500, 'Clerk server authentication is not configured correctly.');
  }

  return null;
};

const verifyClerkToken = async (request: VercelRequest) => {
  const token = getBearerToken(request);

  return verifyToken(token, {
    authorizedParties: getClerkAuthorizedParties(),
    jwtKey: getOptionalEnv('CLERK_JWT_KEY') || undefined,
    secretKey: getRequiredEnv('CLERK_SECRET_KEY'),
  });
};

const hasAdminClaim = (decodedToken: VerifiedRequestUser) => {
  const role = typeof decodedToken.role === 'string' ? decodedToken.role.trim().toLowerCase() : '';
  const roles = Array.isArray(decodedToken.roles)
    ? decodedToken.roles.filter((value): value is string => typeof value === 'string')
    : [];

  return decodedToken.admin === true || role === 'admin' || roles.includes('admin');
};

const getConfiguredAdminEmail = () =>
  normalizeEmail(process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '');

export const hasAdminAccess = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  if (normalizedEmail === getConfiguredAdminEmail()) {
    return true;
  }

  const adminAccessDoc = await getAdminDb().collection('admin_access').doc(normalizedEmail).get();
  return adminAccessDoc.exists;
};

export const verifyRequestUser = async (
  request: VercelRequest,
  expectedUserId?: string,
): Promise<VerifiedRequestUser> => {
  try {
    const tokenClaims = await verifyClerkToken(request);
    const uid = typeof tokenClaims.sub === 'string' ? tokenClaims.sub.trim() : '';

    if (!uid) {
      throw new ApiError(401, 'Invalid Clerk authentication token.');
    }

    if (expectedUserId && uid !== expectedUserId) {
      throw new ApiError(403, 'Authenticated user does not match the order owner.');
    }

    return {
      admin: tokenClaims.admin === true,
      email: await resolvePrimaryEmail(uid, tokenClaims),
      role: getStringClaim(tokenClaims, 'role'),
      roles: getStringArrayClaim(tokenClaims, 'roles'),
      sessionId: typeof tokenClaims.sid === 'string' ? tokenClaims.sid : null,
      tokenClaims,
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

    console.error('Clerk token verification failed', error);
    throw new ApiError(401, 'Invalid Clerk authentication token.');
  }
};

export const verifyAdminRequest = async (request: VercelRequest) => {
  const decodedToken = await verifyRequestUser(request);
  const normalizedEmail = normalizeEmail(decodedToken.email || '');

  if (!normalizedEmail) {
    throw new ApiError(403, 'Admin access requires an email-backed account.');
  }

  if (!hasAdminClaim(decodedToken) && !(await hasAdminAccess(normalizedEmail))) {
    throw new ApiError(403, 'Admin access required.');
  }

  return decodedToken;
};
