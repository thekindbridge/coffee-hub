import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../../../../api/_lib/errors.js';
import { isFirebaseAdminReady } from '../../../../api/_lib/firebaseAdmin.js';

export type ApiServiceResponse<TBody = unknown> = {
  body: TBody;
  headers?: Record<string, string>;
  statusCode: number;
};

export const jsonResponse = <TBody>(
  statusCode: number,
  body: TBody,
  headers?: Record<string, string>,
): ApiServiceResponse<TBody> => ({
  body,
  headers,
  statusCode,
});

export const sendApiResponse = (
  response: VercelResponse,
  serviceResponse: ApiServiceResponse,
) => {
  Object.entries(serviceResponse.headers || {}).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  return response.status(serviceResponse.statusCode).json(serviceResponse.body);
};

export const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const getRequestAction = (request: VercelRequest) =>
  (getQueryValue(request.query.action) || '').trim().toLowerCase();

export const methodNotAllowedResponse = (allowedMethods: string[]) =>
  jsonResponse(
    405,
    { error: 'Method not allowed.' },
    { Allow: allowedMethods.join(', ') },
  );

export const firebaseUnavailableResponse = (message: string) =>
  jsonResponse(200, {
    fallback: true,
    message,
    success: false,
  });

export const isFirebaseUnavailable = () => !isFirebaseAdminReady();

const isFirebaseInitError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return Boolean(
    message.includes('firebase') ||
    message.includes('credential') ||
    message.includes('firestore') ||
    message.includes('cannot read properties of null'),
  );
};

export const toErrorResponse = (
  error: unknown,
  logLabel: string,
  fallbackMessage: string,
) => {
  if (isFirebaseUnavailable() || isFirebaseInitError(error)) {
    console.warn('Firebase unavailable, returning fallback response');
    return firebaseUnavailableResponse(fallbackMessage || 'Service temporarily unavailable.');
  }

  if (error instanceof ApiError) {
    return jsonResponse(error.statusCode, { error: error.message });
  }

  console.error('API ERROR:', error);
  console.error(logLabel, error);
  return jsonResponse(500, { error: fallbackMessage || 'Internal error' });
};
