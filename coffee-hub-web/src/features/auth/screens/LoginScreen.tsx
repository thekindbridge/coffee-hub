import { Browser } from '@capacitor/browser';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useClerk } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { ArrowRight, Coffee, KeyRound, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthShell } from '../../customer/components/AuthShell';
import { SteamEffect } from '../../customer/components/SteamEffect';
import {
  clearGoogleAuthCallbackUrl,
  getClerkErrorMessage,
  getGoogleAuthRedirectUrls,
  isGoogleAuthCallbackUrl,
  isNativeAuthPlatform,
  isValidAuthEmail,
  normalizeAuthEmail,
} from '../../../services/auth/authService';

type LoginStep = 'email' | 'code';

let activeGoogleCallbackUrl: string | null = null;
let activeGoogleCallbackPromise: Promise<unknown> | null = null;

export const LoginScreen = () => {
  const clerk = useClerk();
  const { isLoaded, setActive, signIn } = useSignIn();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isStartingGoogleSignIn, setIsStartingGoogleSignIn] = useState(false);
  const [isHandlingGoogleCallback, setIsHandlingGoogleCallback] = useState(false);

  const normalizedEmail = useMemo(() => normalizeAuthEmail(email), [email]);
  const isBusy =
    !isLoaded ||
    isSendingCode ||
    isVerifyingCode ||
    isStartingGoogleSignIn ||
    isHandlingGoogleCallback;

  useEffect(() => {
    if (!isLoaded || !isGoogleAuthCallbackUrl()) {
      return;
    }

    const callbackUrl = window.location.href;
    let isMounted = true;

    setError('');
    setInfoMessage('Finishing Google sign-in...');
    setIsHandlingGoogleCallback(true);

    const { redirectUrlComplete } = getGoogleAuthRedirectUrls(callbackUrl);

    if (!activeGoogleCallbackPromise || activeGoogleCallbackUrl !== callbackUrl) {
      activeGoogleCallbackUrl = callbackUrl;
      activeGoogleCallbackPromise = clerk.handleRedirectCallback({
        signInFallbackRedirectUrl: redirectUrlComplete,
        signInForceRedirectUrl: redirectUrlComplete,
        signUpFallbackRedirectUrl: redirectUrlComplete,
        signUpForceRedirectUrl: redirectUrlComplete,
      }).finally(() => {
        activeGoogleCallbackUrl = null;
        activeGoogleCallbackPromise = null;
      });
    }

    void activeGoogleCallbackPromise.catch(caughtError => {
      const cleanedUrl = clearGoogleAuthCallbackUrl(callbackUrl);
      window.history.replaceState(null, document.title, cleanedUrl);

      if (isMounted) {
        setError(getClerkErrorMessage(caughtError, 'Unable to complete Google sign-in right now.'));
      }
    }).finally(() => {
      if (isMounted) {
        setIsHandlingGoogleCallback(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [clerk, isLoaded]);

  const handleSendCode = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!normalizedEmail) {
      setError('Enter your email address.');
      return;
    }

    if (!normalizedEmail.includes('@') || !isValidAuthEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!isLoaded || !signIn) {
      setError('Authentication is still loading. Please try again.');
      return;
    }

    setIsSendingCode(true);
    setError('');
    setInfoMessage('');

    try {
      const signInAttempt = await signIn.create({ identifier: normalizedEmail });
      const emailCodeFactor = signInAttempt.supportedFirstFactors?.find(
        factor => factor.strategy === 'email_code',
      );

      if (!emailCodeFactor || !('emailAddressId' in emailCodeFactor)) {
        throw new Error('Email OTP is not enabled for sign-in. Enable Email code in the Clerk dashboard.');
      }

      await signInAttempt.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailCodeFactor.emailAddressId,
      });

      setStep('code');
      setCode('');
      setInfoMessage(`We sent a sign-in code to ${normalizedEmail}.`);
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          'Unable to send a sign-in code. Make sure this email can sign in to Coffee Hub.',
        ),
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Enter the code from your email.');
      return;
    }

    if (!isLoaded || !signIn || !setActive) {
      setError('Authentication is still loading. Please try again.');
      return;
    }

    setIsVerifyingCode(true);
    setError('');
    setInfoMessage('');

    try {
      const signInAttempt = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: trimmedCode,
      });

      if (signInAttempt.status !== 'complete' || !signInAttempt.createdSessionId) {
        throw new Error('This account needs another verification step before it can sign in.');
      }

      await setActive({ session: signInAttempt.createdSessionId });
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'Invalid or expired code. Try again.'));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) {
      setError('Authentication is still loading. Please try again.');
      return;
    }

    setIsStartingGoogleSignIn(true);
    setError('');
    setInfoMessage(isNativeAuthPlatform() ? 'Opening secure Google sign-in...' : 'Redirecting to Google...');

    try {
      const { redirectUrl, redirectUrlComplete } = getGoogleAuthRedirectUrls();

      if (isNativeAuthPlatform()) {
        const signInAttempt = await signIn.create({
          strategy: 'oauth_google',
          redirectUrl,
          actionCompleteRedirectUrl: redirectUrlComplete,
        });
        const externalVerificationUrl =
          signInAttempt.firstFactorVerification.externalVerificationRedirectURL?.toString();

        if (!externalVerificationUrl) {
          throw new Error('Unable to open Google sign-in right now.');
        }

        try {
          await Browser.open({ url: externalVerificationUrl });
        } catch {
          window.location.assign(externalVerificationUrl);
        }

        return;
      }

      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl,
        redirectUrlComplete,
      });
    } catch (caughtError) {
      setInfoMessage('');
      setError(getClerkErrorMessage(caughtError, 'Unable to start Google sign-in right now.'));
    } finally {
      setIsStartingGoogleSignIn(false);
    }
  };

  return (
    <AuthShell>
      <motion.section
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[350px] overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,250,244,0.1),rgba(88,50,28,0.1))] px-5 py-6 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-[12px] sm:max-w-[380px] sm:px-7 sm:py-7"
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
            Fresh Food <span aria-hidden="true">&bull;</span> Fast Delivery
          </p>

          {isHandlingGoogleCallback ? (
            <div className="mt-7 w-full rounded-[18px] border border-white/12 bg-white/8 px-4 py-4 text-sm font-medium text-[#f8e9d8]">
              Finishing Google sign-in...
            </div>
          ) : null}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="mt-7 w-full space-y-3">
              <label className="block text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0cfad]">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="coffee-input pl-10"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  placeholder="you@example.com"
                  disabled={isBusy}
                />
              </div>
              <button
                type="submit"
                disabled={isBusy}
                className="coffee-btn-primary w-full justify-center disabled:opacity-70"
              >
                {isSendingCode ? 'Sending code...' : 'Send sign-in code'}
                {!isSendingCode && <ArrowRight size={17} />}
              </button>
              <div className="flex items-center gap-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f0cfad]/70">
                <span className="h-px flex-1 bg-white/10" />
                <span>or</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <button
                type="button"
                disabled={isBusy}
                className="coffee-btn-secondary w-full justify-center disabled:opacity-70"
                onClick={() => void handleGoogleSignIn()}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] font-bold text-[#120c09]">
                  G
                </span>
                {isStartingGoogleSignIn ? 'Opening Google...' : 'Continue with Google'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="mt-7 w-full space-y-3">
              <label className="block text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0cfad]">
                Email code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="coffee-input pl-10"
                  value={code}
                  onChange={event => {
                    setCode(event.target.value);
                    setError('');
                  }}
                  placeholder="Enter code"
                  disabled={isBusy}
                />
              </div>
              <button
                type="submit"
                disabled={isBusy}
                className="coffee-btn-primary w-full justify-center disabled:opacity-70"
              >
                {isVerifyingCode ? 'Signing in...' : 'Verify and continue'}
                {!isVerifyingCode && <ArrowRight size={17} />}
              </button>
              <button
                type="button"
                disabled={isBusy}
                className="coffee-btn-secondary w-full justify-center disabled:opacity-70"
                onClick={() => void handleSendCode()}
              >
                Resend code
              </button>
              <button
                type="button"
                disabled={isBusy}
                className="coffee-btn-secondary w-full justify-center disabled:opacity-70"
                onClick={() => void handleGoogleSignIn()}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] font-bold text-[#120c09]">
                  G
                </span>
                {isStartingGoogleSignIn ? 'Opening Google...' : 'Continue with Google'}
              </button>
              <button
                type="button"
                disabled={isBusy}
                className="w-full rounded-[8px] px-3 py-2 text-xs font-semibold text-ink-muted transition hover:text-accent disabled:opacity-70"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                  setInfoMessage('');
                }}
              >
                Use a different email
              </button>
            </form>
          )}

          {infoMessage && (
            <div className="mt-4 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
              {infoMessage}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              {error}
            </div>
          )}
        </div>
      </motion.section>
    </AuthShell>
  );
};
