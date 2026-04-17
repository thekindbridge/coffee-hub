import { toAppServiceError } from '../platform/serviceError';

const readJson = async (response: Response) => response.json().catch(() => ({}));

const buildHeaders = (idToken?: string, includeJsonContentType = false) => {
  const headers: Record<string, string> = {};

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  return headers;
};

export const getApi = async <TResponse>(path: string, idToken?: string) => {
  try {
    const response = await fetch(path, {
      method: 'GET',
      headers: buildHeaders(idToken),
    });

    const payload = await readJson(response);
    if (!response.ok) {
      const errorMessage = typeof payload?.error === 'string' ? payload.error : 'Request failed.';
      throw toAppServiceError(errorMessage, errorMessage, 'network');
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
  idToken: string,
) => {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: buildHeaders(idToken, true),
      body: JSON.stringify(body),
    });

    const payload = await readJson(response);
    if (!response.ok) {
      const errorMessage = typeof payload?.error === 'string' ? payload.error : 'Request failed.';
      throw toAppServiceError(errorMessage, errorMessage, 'network');
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
