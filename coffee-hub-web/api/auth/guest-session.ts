import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import { getAdminAuth } from '../_lib/firebaseAdmin.js';

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeUid = (value: string) => value.trim();

const buildDisplayNameFromEmail = (email: string) => {
  const localPart = normalizeEmail(email).split('@')[0] || 'coffeehub';

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'COFFEE-HUB Guest';
};

const getAuthErrorCode = (error: unknown) =>
  error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : '';

const parseRequestBody = (body: unknown) => {
  const payload = (body && typeof body === 'object'
    ? body
    : {}) as Record<string, unknown>;
  const email = normalizeEmail((payload.email as string) || 'guest@coffeehub.com');
  const requestedUid = normalizeUid((payload.uid as string) || 'guest');
  const displayName = `${payload.displayName || ''}`.trim() || buildDisplayNameFromEmail(email);

  if (!email) {
    throw new ApiError(400, 'Guest session email is required.');
  }

  if (!requestedUid) {
    throw new ApiError(400, 'Guest session uid is required.');
  }

  return {
    displayName,
    email,
    requestedUid,
  };
};

const findUserByEmail = async (email: string) => {
  try {
    return await getAdminAuth().getUserByEmail(email);
  } catch (error) {
    if (getAuthErrorCode(error) === 'auth/user-not-found') {
      return null;
    }

    throw error;
  }
};

const ensureGuestUser = async ({
  displayName,
  email,
  requestedUid,
}: {
  displayName: string;
  email: string;
  requestedUid: string;
}) => {
  const adminAuth = getAdminAuth();
  const existingEmailUser = await findUserByEmail(email);

  if (existingEmailUser) {
    if (existingEmailUser.displayName !== displayName) {
      await adminAuth.updateUser(existingEmailUser.uid, { displayName });
    }

    return {
      displayName,
      email: existingEmailUser.email || email,
      uid: existingEmailUser.uid,
    };
  }

  try {
    const existingUidUser = await adminAuth.getUser(requestedUid);
    const nextEmail = existingUidUser.email || email;
    const nextDisplayName = existingUidUser.displayName || displayName;

    if (existingUidUser.email !== email || existingUidUser.displayName !== displayName) {
      await adminAuth.updateUser(requestedUid, {
        displayName,
        email,
      });
    }

    return {
      displayName: nextDisplayName,
      email: nextEmail,
      uid: existingUidUser.uid,
    };
  } catch (error) {
    if (getAuthErrorCode(error) !== 'auth/user-not-found') {
      throw error;
    }
  }

  const createdUser = await adminAuth.createUser({
    displayName,
    email,
    uid: requestedUid,
  });

  return {
    displayName: createdUser.displayName || displayName,
    email: createdUser.email || email,
    uid: createdUser.uid,
  };
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled guest-session error', error);
  response.status(500).json({ error: 'Unable to prepare the guest session right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const guestRequest = parseRequestBody(request.body);
    const guestUser = await ensureGuestUser(guestRequest);
    const customToken = await getAdminAuth().createCustomToken(guestUser.uid);

    response.status(200).json({
      customToken,
      user: guestUser,
    });
  } catch (error) {
    sendError(response, error);
  }
}
