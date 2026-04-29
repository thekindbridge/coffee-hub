export type OtpControlErrorCode = 'otp_blocked' | 'otp_cooldown';

type OtpControlSuccessResponse = {
  cooldownSeconds: number;
  success: true;
};

type OtpControlErrorResponse = {
  blockedUntil?: string;
  code?: OtpControlErrorCode;
  error?: string;
  retryAfterSeconds?: number;
};

export class OtpControlError extends Error {
  readonly blockedUntil: string;
  readonly code: OtpControlErrorCode;
  readonly retryAfterSeconds: number;

  constructor(
    message: string,
    {
      blockedUntil = '',
      code = 'otp_cooldown',
      retryAfterSeconds = 0,
    }: {
      blockedUntil?: string;
      code?: OtpControlErrorCode;
      retryAfterSeconds?: number;
    } = {},
  ) {
    super(message);
    this.name = 'OtpControlError';
    this.blockedUntil = blockedUntil;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const readJson = async <TResponse>(response: Response) =>
  response.json().catch(() => ({} as TResponse));

export const reserveOtpRequest = async (
  phone: string,
): Promise<OtpControlSuccessResponse> => {
  const response = await fetch('/api/auth/otp-control', {
    body: JSON.stringify({ phone }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await readJson<OtpControlSuccessResponse & OtpControlErrorResponse>(response);

  if (!response.ok) {
    const errorMessage = payload.error || 'Unable to send the OTP right now. Please try again.';

    if (payload.code === 'otp_blocked' || payload.code === 'otp_cooldown') {
      throw new OtpControlError(
        errorMessage,
        {
          blockedUntil: payload.blockedUntil,
          code: payload.code,
          retryAfterSeconds: payload.retryAfterSeconds,
        },
      );
    }

    throw new Error(errorMessage);
  }

  return {
    cooldownSeconds:
      typeof payload.cooldownSeconds === 'number' && payload.cooldownSeconds > 0
        ? payload.cooldownSeconds
        : 60,
    success: true,
  };
};
