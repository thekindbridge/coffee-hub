export const postApi = async <TResponse>(
  path: string,
  body: unknown,
  idToken: string,
) => {
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
    throw new Error(errorMessage);
  }

  return payload as TResponse;
};
