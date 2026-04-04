import { AppServiceError, toAppServiceError } from '../serviceError';

const LEGACY_FIREBASE_AUTH_ERROR = 'Missing Firebase authentication token.';

const getApiBaseUrl = () => {
  const value = `${process.env.EXPO_PUBLIC_API_BASE_URL ?? ''}`.trim();

  if (!value) {
    throw new AppServiceError(
      'Missing EXPO_PUBLIC_API_BASE_URL. Add it to coffee-hub-app/.env.',
      { code: 'validation' },
    );
  }

  return value.replace(/\/+$/, '');
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};

const getApiErrorMessage = (
  path: string,
  status: number,
  payload: unknown,
) => {
  const rawMessage =
    typeof (payload as { error?: unknown })?.error === 'string' &&
    (payload as { error: string }).error.trim()
      ? (payload as { error: string }).error.trim()
      : 'Request failed.';

  if (
    status === 401 &&
    rawMessage === LEGACY_FIREBASE_AUTH_ERROR &&
    path.startsWith('/api/orders')
  ) {
    return 'This server is running an older order API that still requires Firebase bearer tokens. Deploy the latest coffee-hub-web backend or point EXPO_PUBLIC_API_BASE_URL to the updated server before testing checkout.';
  }

  return rawMessage;
};

const buildHeaders = (idToken?: string) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  return headers;
};

export const getApi = async <TResponse>(path: string, idToken?: string) => {
  try {
    const response = await fetch(buildApiUrl(path), {
      method: 'GET',
      headers: buildHeaders(idToken),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppServiceError(
        getApiErrorMessage(path, response.status, payload),
        { code: 'network' },
      );
    }

    return payload as TResponse;
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to reach the server right now. Please try again.',
      'network',
    );
  }
};

export const postApi = async <TResponse>(
  path: string,
  body: unknown,
  idToken?: string,
) => {
  try {
    const response = await fetch(buildApiUrl(path), {
      method: 'POST',
      headers: {
        ...buildHeaders(idToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppServiceError(
        getApiErrorMessage(path, response.status, payload),
        { code: 'network' },
      );
    }

    return payload as TResponse;
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to reach the server right now. Please try again.',
      'network',
    );
  }
};
