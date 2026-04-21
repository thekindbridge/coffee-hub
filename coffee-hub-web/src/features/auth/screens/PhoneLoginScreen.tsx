import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import type { ConfirmationResult } from 'firebase/auth';
import { ArrowRight, Coffee, KeyRound, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import {
  formatPhoneForDisplay,
  normalizePhoneNumber,
  stripPhoneCountryCode,
} from '../../../../shared/phone';
import { AuthShell } from '../../customer/components/AuthShell';
import { SteamEffect } from '../../customer/components/SteamEffect';
import {
  clearRecaptcha,
  getPhoneAuthErrorMessage,
  initRecaptcha,
  sendOTP,
  verifyOTP,
} from '../../../services/firebase/phoneAuthService';

const OTP_LENGTH = 6;
const RESEND_TIMEOUT_SECONDS = 30;
const RECAPTCHA_CONTAINER_ID = 'firebase-phone-recaptcha';

const createEmptyOtp = () => Array.from({ length: OTP_LENGTH }, () => '');

export const PhoneLoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(createEmptyOtp);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendAvailableIn, setResendAvailableIn] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const normalizedPhone = useMemo(() => {
    try {
      return normalizePhoneNumber(phoneNumber);
    } catch {
      return '';
    }
  }, [phoneNumber]);
  const otpValue = otpDigits.join('');
  const isOtpStep = Boolean(confirmationResult);
  const isBusy = isSendingOtp || isVerifyingOtp;

  useEffect(() => () => {
    clearRecaptcha();
  }, []);

  useEffect(() => {
    if (!isOtpStep) {
      return;
    }

    otpRefs.current[0]?.focus();
  }, [isOtpStep]);

  useEffect(() => {
    if (resendAvailableIn <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResendAvailableIn(previousValue => Math.max(previousValue - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendAvailableIn]);

  const handleSendOtp = async () => {
    if (!normalizedPhone) {
      setError('Enter a valid mobile number.');
      return;
    }

    setIsSendingOtp(true);
    setError('');
    setInfoMessage('');

    try {
      initRecaptcha(RECAPTCHA_CONTAINER_ID);
      const nextConfirmationResult = await sendOTP(normalizedPhone);

      setConfirmationResult(nextConfirmationResult);
      setOtpDigits(createEmptyOtp());
      setResendAvailableIn(RESEND_TIMEOUT_SECONDS);
      setInfoMessage(`OTP sent to ${formatPhoneForDisplay(normalizedPhone)}.`);
    } catch (caughtError) {
      clearRecaptcha();
      setError(
        getPhoneAuthErrorMessage(
          caughtError,
          'Unable to send OTP right now. Please try again.',
        ),
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = nextValue;
    setOtpDigits(nextDigits);
    setError('');

    if (nextValue && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedValue = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pastedValue) {
      return;
    }

    const nextDigits = createEmptyOtp();
    pastedValue.split('').forEach((digit, index) => {
      nextDigits[index] = digit;
    });
    setOtpDigits(nextDigits);

    const focusIndex = Math.min(pastedValue.length, OTP_LENGTH) - 1;
    if (focusIndex >= 0) {
      otpRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) {
      setError('Request an OTP first.');
      return;
    }

    if (otpValue.length !== OTP_LENGTH) {
      setError('Enter the 6-digit OTP.');
      return;
    }

    setIsVerifyingOtp(true);
    setError('');
    setInfoMessage('');

    try {
      await verifyOTP(confirmationResult, otpValue);
      setInfoMessage('Phone verified successfully. Redirecting...');
    } catch (caughtError) {
      setError(
        getPhoneAuthErrorMessage(
          caughtError,
          'Unable to verify OTP right now. Please try again.',
        ),
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const resetPhoneFlow = () => {
    setConfirmationResult(null);
    setOtpDigits(createEmptyOtp());
    setError('');
    setInfoMessage('');
    setResendAvailableIn(0);
    clearRecaptcha();
  };

  return (
    <AuthShell>
      <motion.section
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[350px] overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,250,244,0.1),rgba(88,50,28,0.1))] px-5 py-6 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-[12px] sm:max-w-[400px] sm:px-7 sm:py-7"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,224,190,0.14),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mx-auto mb-6 mt-1 flex h-36 w-36 items-center justify-center rounded-[38px] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,235,212,0.16),rgba(90,51,29,0.08)_72%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_22px_55px_rgba(13,7,4,0.38)] sm:h-40 sm:w-40">
            <SteamEffect className="-top-14 scale-110 sm:-top-16 sm:scale-125" />
            <div className="absolute inset-3 rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
            <Coffee className="coffee-icon-float relative text-[#ffc58b]" size={68} strokeWidth={1.65} />
          </div>

          <h1 className="font-display text-[2.1rem] font-semibold tracking-[0.08em] text-[#fff8f1] sm:text-[2.45rem]">
            COFFEE-HUB
          </h1>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.45em] text-[#f0cfad] sm:text-xs">
            Inkollu
          </p>
          <p className="mt-3 text-sm font-medium text-[#f8e9d8] sm:text-[15px]">
            Login with your mobile number to continue ordering.
          </p>

          {!isOtpStep ? (
            <div className="mt-7 w-full space-y-3">
              <label className="block text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0cfad]">
                Mobile Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus
                  className="coffee-input pl-16"
                  value={stripPhoneCountryCode(phoneNumber)}
                  onChange={event => {
                    setPhoneNumber(event.target.value);
                    setError('');
                  }}
                  placeholder="9876543210"
                  disabled={isBusy}
                />
              </div>
              <button
                type="button"
                disabled={isBusy}
                className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                onClick={() => void handleSendOtp()}
              >
                {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                {!isSendingOtp && <ArrowRight size={17} />}
              </button>
              <p className="text-left text-[11px] leading-5 text-[#f8e9d8]/78">
                Firebase invisible reCAPTCHA protects this login step in the background.
              </p>
            </div>
          ) : (
            <div className="mt-7 w-full space-y-4">
              <div>
                <label className="block text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0cfad]">
                  Enter OTP
                </label>
                <p className="mt-2 text-left text-xs text-[#f8e9d8]/78">
                  We sent a 6-digit code to {formatPhoneForDisplay(normalizedPhone)}.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                {otpDigits.map((digit, index) => (
                  <div key={`otp-${index}`} className="relative flex-1">
                    <KeyRound className="pointer-events-none absolute left-1/2 top-2 h-3.5 w-3.5 -translate-x-1/2 text-ink-muted/55" />
                    <input
                      ref={element => {
                        otpRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      className="coffee-input px-0 pb-3 pt-7 text-center text-lg tracking-[0.28em]"
                      maxLength={1}
                      value={digit}
                      onChange={event => handleOtpChange(index, event)}
                      onKeyDown={event => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      disabled={isBusy}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isBusy}
                className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                onClick={() => void handleVerifyOtp()}
              >
                {isVerifyingOtp ? 'Verifying OTP...' : 'Verify OTP'}
                {!isVerifyingOtp && <ArrowRight size={17} />}
              </button>

              <button
                type="button"
                disabled={isBusy || resendAvailableIn > 0}
                className="coffee-btn-secondary w-full justify-center disabled:opacity-70"
                onClick={() => void handleSendOtp()}
              >
                {resendAvailableIn > 0 ? `Resend OTP in ${resendAvailableIn}s` : 'Resend OTP'}
              </button>

              <button
                type="button"
                disabled={isBusy}
                className="w-full rounded-[8px] px-3 py-2 text-xs font-semibold text-ink-muted transition hover:text-accent disabled:opacity-70"
                onClick={resetPhoneFlow}
              >
                Change mobile number
              </button>
            </div>
          )}

          {infoMessage && (
            <div className="mt-4 w-full rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
              {infoMessage}
            </div>
          )}
          {error && (
            <div className="mt-4 w-full rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              {error}
            </div>
          )}
        </div>

        <div id={RECAPTCHA_CONTAINER_ID} className="pointer-events-none absolute inset-x-0 bottom-0 h-0 overflow-hidden opacity-0" />
      </motion.section>
    </AuthShell>
  );
};
