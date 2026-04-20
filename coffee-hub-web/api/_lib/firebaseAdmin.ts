import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { getMessaging } from 'firebase-admin/messaging';
import type { VercelRequest } from '@vercel/node';
import { createClerkClient, verifyToken, type ClerkClient } from '@clerk/backend';

import { ApiError } from './errors.js';

type VerifiedRequestUser = {
  email?: string;
  sessionId: string | null;
  tokenClaims: Record<string, unknown>;
  uid: string;
};

let cachedAdminApp: App | null = null;
let cachedAdminDb: Firestore | null = null;
let cachedAdminAuth: Auth | null = null;
let cachedAdminMessaging: Messaging | null = null;
let cachedClerkClient: ClerkClient | null = null;

const DEFAULT_CLERK_AUTHORIZED_PARTIES = [
  'https://coffee-hub-inkollu.vercel.app',
  'http://localhost:5173',
  'http://localhost',
  'https://localhost',
  'http://10.0.2.2:5173',
  'capacitor://localhost',
  'ionic://localhost',
];

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeAuthorizedParty = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  if (trimmedValue.startsWith('capacitor://') || trimmedValue.startsWith('ionic://')) {
    return trimmedValue.replace(/[/?#].*$/, '').replace(/\/+$/, '');
  }

  const normalizedValue = (
    trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')
      ? trimmedValue
      : `https://${trimmedValue}`
  ).replace(/\/+$/, '');

  try {
    return new URL(normalizedValue).origin;
  } catch {
    return normalizedValue;
  }
};

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
  const configuredValues = configuredValue
    ? configuredValue
      .split(',')
      .map(normalizeAuthorizedParty)
      .filter(Boolean)
    : [];
  const envDerivedValues = [
    process.env.APP_URL || '',
    process.env.PUBLIC_APP_URL || '',
    process.env.SITE_URL || '',
    process.env.CAP_SERVER_URL || '',
    process.env.VERCEL_URL || '',
    process.env.VERCEL_BRANCH_URL || '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL || '',
  ]
    .map(normalizeAuthorizedParty)
    .filter(Boolean);

  return Array.from(
    new Set([
      ...DEFAULT_CLERK_AUTHORIZED_PARTIES,
      ...configuredValues,
      ...envDerivedValues,
    ]),
  );
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

export const createFirebaseCustomToken = async (userId: string, email: string) => {
  const normalizedEmail = normalizeEmail(email);

  return getAdminAuthClient().createCustomToken(
    userId,
    normalizedEmail
      ? { clerkEmail: normalizedEmail }
      : undefined,
  );
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

export const hasAdminAccess = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  if (normalizedEmail === getConfiguredAdminEmail()) {
    return true;
  }

  return (await getUserRoleByEmail(normalizedEmail)) === 'admin';
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
      email: await resolvePrimaryEmail(uid, tokenClaims),
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

  const isConfiguredOwner = normalizedEmail === getConfiguredAdminEmail();
  const hasFirestoreAdminRole = (await getUserRoleById(decodedToken.uid)) === 'admin';

  if (!isConfiguredOwner && !hasFirestoreAdminRole) {
    throw new ApiError(403, 'Admin access required.');
  }

  return decodedToken;
};
