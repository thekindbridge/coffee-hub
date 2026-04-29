import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Coffee, LockKeyhole, RotateCcw, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import {
  PHONE_AUTH_RECAPTCHA_CONTAINER_ID,
} from '../../../services/auth/authService';
import {
  shouldUseVisibleRecaptcha,
  type RecaptchaMode,
} from '../../../services/firebase/phoneAuthService';
import {
  formatPhoneForDisplay,
  normalizePhoneNumber,
  safeNormalizePhoneNumber,
  stripPhoneCountryCode,
} from '../../../../shared/phone';
import { AuthShell } from '../../customer/components/AuthShell';
import { SteamEffect } from '../../customer/components/SteamEffect';
import { useAuth } from '../hooks/useAuth';

export const PhoneLoginScreen = () => {
  const {
    pendingPhoneNumber,
    isOtpSent,
    requestOtp,
    verifyOtp,
    cancelOtp,
  } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [recaptchaMode, setRecaptchaMode] = useState<RecaptchaMode>('invisible');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const lastOtpRequestAtRef = useRef(0);

  const activePhoneNumber = useMemo(
    () => pendingPhoneNumber || safeNormalizePhoneNumber(phoneNumber),
    [pendingPhoneNumber, phoneNumber],
  );

  const resetMessages = () => {
    setError('');
    setInfoMessage('');
  };

  const handleSendOtp = async () => {
    const now = Date.now();
    if (now - lastOtpRequestAtRef.current < 1000) {
      return;
    }

    lastOtpRequestAtRef.current = now;

    let normalizedPhone = '';

    try {
      normalizedPhone = normalizePhoneNumber(phoneNumber);
    } catch {
      setError('Enter a valid mobile number.');
      return;
    }

    setIsSendingOtp(true);
    resetMessages();

    try {
      const pendingVerification = await requestOtp(normalizedPhone, recaptchaMode);
      setInfoMessage(
        `OTP sent to ${formatPhoneForDisplay(pendingVerification.phone)}. Enter the 6-digit code to continue.`,
      );
    } catch (caughtError) {
      if (recaptchaMode === 'invisible' && shouldUseVisibleRecaptcha(caughtError)) {
        setRecaptchaMode('visible');
        setError('This device needs a visible reCAPTCHA check. Complete it, then tap Send OTP again.');
      } else {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to send the OTP right now. Please try again.',
        );
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError('Enter the 6-digit OTP to continue.');
      return;
    }

    setIsVerifyingOtp(true);
    resetMessages();

    try {
      await verifyOtp(otpCode);
      setInfoMessage(`Signed in as ${formatPhoneForDisplay(activePhoneNumber)}.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to verify the OTP right now. Please try again.',
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleChangeNumber = () => {
    cancelOtp();
    setOtpCode('');
    setRecaptchaMode('invisible');
    lastOtpRequestAtRef.current = 0;
    resetMessages();
  };

  return (
    <AuthShell>
      <motion.section
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[350px] overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,250,244,0.1),rgba(88,50,28,0.1))] px-5 py-6 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-[12px] sm:max-w-[420px] sm:px-7 sm:py-7"
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
            {isOtpSent
              ? `Verify the OTP sent to ${formatPhoneForDisplay(activePhoneNumber)}.`
              : 'Enter your mobile number to receive a Firebase OTP.'}
          </p>

          <div className="mt-7 w-full space-y-4">
            {!isOtpSent ? (
              <div className="space-y-4">
                <div className="space-y-3">
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
                        resetMessages();
                      }}
                      placeholder="9876543210"
                      disabled={isSendingOtp}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSendingOtp}
                  className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                  onClick={() => void handleSendOtp()}
                >
                  {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                  {!isSendingOtp && <ArrowRight size={17} />}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0cfad]">
                    OTP
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="coffee-input pl-10"
                      value={otpCode}
                      onChange={event => {
                        setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                        resetMessages();
                      }}
                      placeholder="123456"
                      disabled={isVerifyingOtp}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isVerifyingOtp}
                  className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                  onClick={() => void handleVerifyOtp()}
                >
                  {isVerifyingOtp ? 'Verifying OTP...' : 'Verify OTP'}
                  {!isVerifyingOtp && <ArrowRight size={17} />}
                </button>

                <button
                  type="button"
                  className="coffee-btn-secondary w-full justify-center"
                  onClick={handleChangeNumber}
                >
                  <RotateCcw size={16} />
                  Change Number
                </button>
              </div>
            )}

            <div
              className={recaptchaMode === 'visible'
                ? 'overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-3'
                : 'h-0 overflow-hidden'}
            >
              <div id={PHONE_AUTH_RECAPTCHA_CONTAINER_ID} />
            </div>
          </div>

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
      </motion.section>
    </AuthShell>
  );
};
