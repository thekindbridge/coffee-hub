import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';
import { ApiError } from './errors';

const getRequiredEnv = (key: string, fallback = '') => {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`${key} is not configured.`);
  }

  return value;
};

const adminApp = getApps()[0] || initializeApp({
  credential: cert({
    projectId: getRequiredEnv(
      'FIREBASE_ADMIN_PROJECT_ID',
      process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '',
    ),
    clientEmail: getRequiredEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
    privateKey: getRequiredEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n'),
  }),
});

const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

const getBearerToken = (request: VercelRequest) => {
  const authorizationHeader = request.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing Firebase authentication token.');
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

export const verifyRequestUser = async (request: VercelRequest, expectedUserId?: string) => {
  try {
    const decodedToken = await adminAuth.verifyIdToken(getBearerToken(request));
    if (expectedUserId && decodedToken.uid !== expectedUserId) {
      throw new ApiError(403, 'Authenticated user does not match the order owner.');
    }

    return decodedToken;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, 'Invalid Firebase authentication token.');
  }
};
