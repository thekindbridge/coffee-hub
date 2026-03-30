export type ServiceErrorCode =
  | 'unknown'
  | 'network'
  | 'permission'
  | 'unsupported'
  | 'validation';

type AppServiceErrorOptions = {
  code?: ServiceErrorCode;
  cause?: unknown;
};

export class AppServiceError extends Error {
  readonly code: ServiceErrorCode;
  override readonly cause?: unknown;

  constructor(message: string, options: AppServiceErrorOptions = {}) {
    super(message);
    this.name = 'AppServiceError';
    this.code = options.code ?? 'unknown';
    this.cause = options.cause;
  }
}

export const toAppServiceError = (
  error: unknown,
  fallbackMessage: string,
  code: ServiceErrorCode = 'unknown',
) => {
  if (error instanceof AppServiceError) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return new AppServiceError(error.message, {
      cause: error,
      code,
    });
  }

  return new AppServiceError(fallbackMessage, {
    cause: error,
    code,
  });
};
