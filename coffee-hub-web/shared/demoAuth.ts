import { safeNormalizePhoneNumber } from './phone';

export type DemoAuthRole = 'admin' | 'customer' | 'agent';

export type DemoAuthTokenPayload = {
  authType: 'demo-pin';
  displayName: string;
  issuedAt: number;
  phone: string;
  role: DemoAuthRole;
  sessionId: string;
  uid: string;
};

export const DEMO_AUTH_TOKEN_PREFIX = 'demo.';
export const DEMO_AUTH_PIN = '1234';

const normalizeRole = (value: unknown): DemoAuthRole => {
  if (value === 'admin' || value === 'agent') {
    return value;
  }

  return 'customer';
};

export const normalizeDemoAdminPhones = (phoneNumbers: string[]) => {
  return Array.from(
    new Set(
      phoneNumbers
        .map(phoneNumber => safeNormalizePhoneNumber(phoneNumber))
        .filter(Boolean),
    ),
  );
};

export const resolveDemoRole = (
  phoneNumber: string,
  adminPhoneNumbers: string[],
): DemoAuthRole => {
  const normalizedPhone = safeNormalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) {
    return 'customer';
  }

  return adminPhoneNumbers.includes(normalizedPhone) ? 'admin' : 'customer';
};

export const isDemoAuthToken = (value: string) =>
  value.trim().startsWith(DEMO_AUTH_TOKEN_PREFIX);

export const buildDemoAuthToken = (
  payload: Omit<DemoAuthTokenPayload, 'authType' | 'issuedAt' | 'uid'> &
    Partial<Pick<DemoAuthTokenPayload, 'issuedAt' | 'uid'>>,
) => {
  const normalizedPhone = safeNormalizePhoneNumber(payload.phone);
  if (!normalizedPhone) {
    return '';
  }

  const normalizedPayload: DemoAuthTokenPayload = {
    authType: 'demo-pin',
    displayName: payload.displayName.trim(),
    issuedAt:
      typeof payload.issuedAt === 'number' && Number.isFinite(payload.issuedAt)
        ? payload.issuedAt
        : Date.now(),
    phone: normalizedPhone,
    role: normalizeRole(payload.role),
    sessionId: payload.sessionId.trim(),
    uid: payload.uid?.trim() || normalizedPhone,
  };

  return `${DEMO_AUTH_TOKEN_PREFIX}${encodeURIComponent(JSON.stringify(normalizedPayload))}`;
};

export const parseDemoAuthToken = (token: string): DemoAuthTokenPayload | null => {
  if (!isDemoAuthToken(token)) {
    return null;
  }

  try {
    const rawPayload = token.trim().slice(DEMO_AUTH_TOKEN_PREFIX.length);
    const parsedPayload = JSON.parse(decodeURIComponent(rawPayload)) as Record<string, unknown>;
    const normalizedPhone = safeNormalizePhoneNumber(`${parsedPayload.phone ?? ''}`);
    const sessionId = `${parsedPayload.sessionId ?? ''}`.trim();
    const uid = `${parsedPayload.uid ?? ''}`.trim() || normalizedPhone;

    if (!normalizedPhone || !sessionId || !uid) {
      return null;
    }

    return {
      authType: 'demo-pin',
      displayName: `${parsedPayload.displayName ?? ''}`.trim(),
      issuedAt:
        typeof parsedPayload.issuedAt === 'number' && Number.isFinite(parsedPayload.issuedAt)
          ? parsedPayload.issuedAt
          : 0,
      phone: normalizedPhone,
      role: normalizeRole(parsedPayload.role),
      sessionId,
      uid,
    };
  } catch {
    return null;
  }
};
