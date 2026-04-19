import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../../../../api/_lib/errors.js';

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

export const toErrorResponse = (
  error: unknown,
  logLabel: string,
  fallbackMessage: string,
) => {
  if (error instanceof ApiError) {
    return jsonResponse(error.statusCode, { error: error.message });
  }

  console.error(logLabel, error);
  return jsonResponse(500, { error: fallbackMessage });
};
