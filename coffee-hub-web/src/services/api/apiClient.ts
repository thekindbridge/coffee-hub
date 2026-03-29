import { toAppServiceError } from '../platform/serviceError';

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

    const payload = await response.json().catch(() => ({}));
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
