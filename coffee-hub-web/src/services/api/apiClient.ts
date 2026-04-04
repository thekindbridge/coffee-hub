import { toAppServiceError } from '../platform/serviceError';

const readJson = async (response: Response) => response.json().catch(() => ({}));

export const getApi = async <TResponse>(path: string) => {
  try {
    const response = await fetch(path, {
      method: 'GET',
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
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
