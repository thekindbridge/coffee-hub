import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  AuthContext,
  toAuthState,
} from '../../features/auth/hooks/useAuth';
import {
  cancelOtp,
  logoutCurrentUser,
  observeAuthSession,
  requestOtp,
  verifyOtp,
  type AuthUser,
} from '../../services/auth/authService';
import type { PendingPhoneVerification, RecaptchaMode } from '../../services/firebase/phoneAuthService';

const buildContextState = (
  user: AuthUser | null,
  isAuthReady: boolean,
  pendingPhoneNumber: string,
  handleRequestOtp: (
    phoneNumber: string,
    recaptchaMode?: RecaptchaMode,
  ) => Promise<PendingPhoneVerification>,
  handleVerifyOtp: (otpCode: string) => Promise<AuthUser>,
  handleCancelOtp: () => void,
  handleLogout: () => Promise<void>,
) => toAuthState({
  isAuthenticated: Boolean(user),
  isLoggedIn: Boolean(user),
  isAuthReady,
  currentUserId: user?.uid || '',
  currentUserName: user?.displayName || '',
  currentUserPhone: user?.phone || '',
  pendingPhoneNumber,
  requestOtp: handleRequestOtp,
  verifyOtp: handleVerifyOtp,
  cancelOtp: handleCancelOtp,
  logout: handleLogout,
  role: user?.role || 'customer',
  user,
});

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState('');

  useEffect(() => {
    const unsubscribe = observeAuthSession(nextUser => {
      setUser(nextUser);
      setIsAuthReady(true);

      if (nextUser) {
        setPendingPhoneNumber('');
      }
    });

    return unsubscribe;
  }, []);

  const handleCancelOtp = useCallback(() => {
    cancelOtp();
    setPendingPhoneNumber('');
  }, []);

  const handleLogout = useCallback(async () => {
    handleCancelOtp();
    await logoutCurrentUser();
    setUser(null);
  }, [handleCancelOtp]);

  const handleRequestOtp = useCallback(async (
    phoneNumber: string,
    recaptchaMode: RecaptchaMode = 'invisible',
  ) => {
    const pendingVerification = await requestOtp(phoneNumber, recaptchaMode);
    setPendingPhoneNumber(pendingVerification.phone);
    return pendingVerification;
  }, []);

  const handleVerifyOtp = useCallback(async (otpCode: string) => {
    const nextUser = await verifyOtp(otpCode);
    setPendingPhoneNumber('');
    setUser(nextUser);
    return nextUser;
  }, []);

  const contextValue = useMemo(
    () => buildContextState(
      user,
      isAuthReady,
      pendingPhoneNumber,
      handleRequestOtp,
      handleVerifyOtp,
      handleCancelOtp,
      handleLogout,
    ),
    [
      handleCancelOtp,
      handleLogout,
      handleRequestOtp,
      handleVerifyOtp,
      isAuthReady,
      pendingPhoneNumber,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
