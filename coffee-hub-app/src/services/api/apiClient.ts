import { AppServiceError, toAppServiceError } from '../serviceError';

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
      const errorMessage =
        typeof payload?.error === 'string' && payload.error.trim()
          ? payload.error
          : 'Request failed.';
      throw new AppServiceError(errorMessage, { code: 'network' });
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
      const errorMessage =
        typeof payload?.error === 'string' && payload.error.trim()
          ? payload.error
          : 'Request failed.';
      throw new AppServiceError(errorMessage, { code: 'network' });
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
