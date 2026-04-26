import { toAppServiceError } from '../platform/serviceError';
import {
  getNetworkErrorMessage,
  isNetworkUnavailable,
} from '../platform/networkStatusService';

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

const requestApi = async <TResponse>({
  body,
  idToken,
  method,
  path,
}: {
  body?: unknown;
  idToken?: string;
  method: 'GET' | 'POST' | 'PUT';
  path: string;
}) => {
  if (isNetworkUnavailable()) {
    throw toAppServiceError(
      getNetworkErrorMessage(),
      getNetworkErrorMessage(),
      'network',
    );
  }

  try {
    const response = await fetch(path, {
      method,
      headers: buildHeaders(idToken, body !== undefined),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

export const getApi = async <TResponse>(path: string, idToken?: string) => {
  return requestApi<TResponse>({
    idToken,
    method: 'GET',
    path,
  });
};

export const postApi = async <TResponse>(
  path: string,
  body: unknown,
  idToken: string,
) => requestApi<TResponse>({
  body,
  idToken,
  method: 'POST',
  path,
});

export const putApi = async <TResponse>(
  path: string,
  body: unknown,
  idToken: string,
) => requestApi<TResponse>({
  body,
  idToken,
  method: 'PUT',
  path,
});
