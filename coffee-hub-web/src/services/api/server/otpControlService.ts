import type { VercelRequest } from '@vercel/node';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { ApiError } from '../../../../api/_lib/errors.js';
import { normalizePhoneNumber } from '../../../../shared/phone.js';
import { getServerDb } from './authService.js';
import {
  jsonResponse,
  type ApiServiceResponse,
} from './routeUtils.js';

const OTP_CONTROL_COLLECTION = 'otp_control';
const OTP_BLOCK_DURATION_MS = 15 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 3;
const OTP_MIN_GAP_MS = 60 * 1000;
const OTP_WINDOW_MS = 10 * 60 * 1000;

const toDate = (value: unknown) => {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
};

const parseOtpControlBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request payload is invalid.');
  }

  const payload = body as Record<string, unknown>;
  let phone = '';

  try {
    phone = normalizePhoneNumber(
      typeof payload.phone === 'string' ? payload.phone : '',
    );
  } catch {
    phone = '';
  }

  if (!phone) {
    throw new ApiError(400, 'Enter a valid mobile number.');
  }

  return { phone };
};

export const reserveOtpRequestResponse = async (
  request: VercelRequest,
): Promise<ApiServiceResponse> => {
  const { phone } = parseOtpControlBody(request.body);
  const adminDb = getServerDb();
  const now = new Date();
  const nowMs = now.getTime();
  const controlRef = adminDb.collection(OTP_CONTROL_COLLECTION).doc(phone);

  const decision = await adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(controlRef);
    const data = snapshot.exists
      ? snapshot.data() as Record<string, unknown>
      : {};

    const blockedUntil = toDate(data.blockedUntil);
    if (blockedUntil && blockedUntil.getTime() > nowMs) {
      return {
        blockedUntil: blockedUntil.toISOString(),
        code: 'otp_blocked' as const,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((blockedUntil.getTime() - nowMs) / 1000),
        ),
      };
    }

    const lastRequestTime = toDate(data.lastRequestTime);
    if (lastRequestTime && nowMs - lastRequestTime.getTime() < OTP_MIN_GAP_MS) {
      return {
        blockedUntil: '',
        code: 'otp_cooldown' as const,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((OTP_MIN_GAP_MS - (nowMs - lastRequestTime.getTime())) / 1000),
        ),
      };
    }

    const rawRequestCount = typeof data.requestCount === 'number'
      ? data.requestCount
      : 0;
    const windowStartedAt = toDate(data.windowStartedAt);
    const isWithinActiveWindow =
      Boolean(windowStartedAt) &&
      nowMs - (windowStartedAt as Date).getTime() < OTP_WINDOW_MS;
    const nextRequestCount = isWithinActiveWindow ? rawRequestCount + 1 : 1;
    const nextWindowStartedAt = isWithinActiveWindow
      ? windowStartedAt
      : now;

    const update: Record<string, unknown> = {
      blockedUntil: null,
      lastRequestTime: FieldValue.serverTimestamp(),
      phone,
      requestCount: nextRequestCount,
      windowStartedAt: Timestamp.fromDate(nextWindowStartedAt || now),
    };

    if (nextRequestCount > OTP_MAX_REQUESTS_PER_WINDOW) {
      const nextBlockedUntil = Timestamp.fromMillis(nowMs + OTP_BLOCK_DURATION_MS);
      update.blockedUntil = nextBlockedUntil;
      update.requestCount = OTP_MAX_REQUESTS_PER_WINDOW;
      transaction.set(controlRef, update, { merge: true });
      return {
        blockedUntil: nextBlockedUntil.toDate().toISOString(),
        code: 'otp_blocked' as const,
        retryAfterSeconds: Math.ceil(OTP_BLOCK_DURATION_MS / 1000),
      };
    }

    transaction.set(controlRef, update, { merge: true });
    return {
      blockedUntil: '',
      code: 'allowed' as const,
      retryAfterSeconds: 0,
    };
  });

  if (decision.code === 'otp_blocked') {
    return jsonResponse(429, {
      blockedUntil: decision.blockedUntil,
      code: decision.code,
      error: 'Too many attempts. Try after 15 minutes',
      retryAfterSeconds: decision.retryAfterSeconds,
    });
  }

  if (decision.code === 'otp_cooldown') {
    return jsonResponse(429, {
      code: decision.code,
      error: 'Please wait 60 seconds before requesting again',
      retryAfterSeconds: decision.retryAfterSeconds,
    });
  }

  return jsonResponse(200, {
    cooldownSeconds: 60,
    success: true,
  });
};
