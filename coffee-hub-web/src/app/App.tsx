import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react';
import { ArrowRight } from 'lucide-react';
import { Suspense, useState } from 'react';
import type { Order } from '../types';
import { useOffers } from '../features/offers/hooks/useOffers';
import { useRealtimeAppData } from '../features/app/hooks/useRealtimeAppData';
import { useOrderOperations } from '../features/orders/hooks/useOrderOperations';
import { useProfileManager } from '../features/app/hooks/useProfileManager';
import { useAccessManager } from '../features/app/hooks/useAccessManager';
import { usePushNotifications } from '../features/app/hooks/usePushNotifications';
import { useShopTimingManager } from '../features/app/hooks/useShopTimingManager';
import { useInstallPrompt } from '../features/customer/hooks/useInstallPrompt';
import { Loader } from '../components/ui/Loader';
import { isAuthCallbackRoute } from '../services/auth/authService';
import { lazyNamed } from '../utils/lazyNamed';
import { AppRouter } from './router/AppRouter';

const AuthLoadingPage = lazyNamed(
  () => import('../pages/AuthLoading/AuthLoadingPage'),
  'AuthLoadingPage',
);
const LoginPage = lazyNamed(
  () => import('../pages/Login/LoginPage'),
  'LoginPage',
);
const AuthCallbackPage = lazyNamed(
  () => import('../pages/AuthCallback/AuthCallbackPage'),
  'AuthCallbackPage',
);

const googleSignInButtonClassName =
  'google-btn group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[20px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,250,244,0.94),rgba(244,229,211,0.86))] px-4 py-3.5 text-[15px] font-semibold text-[#24140b] shadow-[0_14px_34px_rgba(24,12,6,0.3)] transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(18,8,4,0.34)] active:scale-[0.985]';

const signUpButtonClassName =
  'w-full rounded-[20px] border border-white/14 bg-white/8 px-4 py-3 text-sm font-semibold text-[#fff8f1] transition-colors duration-300 hover:bg-white/12';

const SignedOutAuthControls = () => (
  <Show when="signed-out">
    <div className="mt-7 flex w-full flex-col gap-3">
      <SignInButton mode="redirect">
        <button type="button" className={googleSignInButtonClassName}>
          <span className="pointer-events-none absolute inset-y-0 left-[-35%] w-20 rotate-[18deg] bg-white/30 blur-2xl auth-card-sheen" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-[0_10px_22px_rgba(255,255,255,0.16)]">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 3.6 14.5 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.9-3.7 8.9-8.9 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
          </span>
          <span className="relative">Continue with Google</span>
          <ArrowRight size={17} className="relative text-[#8e5327] transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </SignInButton>

      <SignUpButton mode="redirect">
        <button type="button" className={signUpButtonClassName}>
          Create account
        </button>
      </SignUpButton>
    </div>
  </Show>
);

const SignedInUserMenu = () => (
  <Show when="signed-in">
    <UserButton />
  </Show>
);

export default function App() {
  const session = useRealtimeAppData();
  const [orderStatus, setOrderStatus] = useState<Order | null>(null);
  const installPrompt = useInstallPrompt();
  const isProcessingAuthCallback = isAuthCallbackRoute();
  const signedInUserMenu = <SignedInUserMenu />;

  const pushNotifications = usePushNotifications({
    isAuthReady: session.isAuthReady,
    isLoggedIn: session.isLoggedIn,
    currentUserId: session.currentUserId,
  });

  const offersState = useOffers({ includeInactive: session.isAdmin });

  const orderOperations = useOrderOperations({
    adminOrders: session.adminOrders,
    setAdminOrders: session.setAdminOrders,
    userOrders: session.userOrders,
    setUserOrders: session.setUserOrders,
    orderStatus,
    setOrderStatus,
    setNewOrderDocIds: session.setNewOrderDocIds,
    currentDeliveryOrder: session.currentDeliveryOrder,
    currentDeliveryAgent: session.currentDeliveryAgent,
    normalizedCurrentEmail: session.normalizedCurrentEmail,
    agentTrackerRef: session.agentTrackerRef,
    trackedOrderIdRef: session.trackedOrderIdRef,
    setIsAgentTracking: session.setIsAgentTracking,
    setAgentPermissionState: session.setAgentPermissionState,
    setAgentTrackerStatus: session.setAgentTrackerStatus,
    agentLastTrackedLocation: session.agentLastTrackedLocation,
    setAgentLastTrackedLocation: session.setAgentLastTrackedLocation,
    onAfterLogout: () => {
      setOrderStatus(null);
    },
  });

  const profileManager = useProfileManager({
    currentUserId: session.currentUserId,
    currentUserEmail: session.currentUserEmail,
    isAdmin: session.isAdmin,
    isDeliveryAgent: session.isDeliveryAgent,
    profileSaved: session.profileSaved,
    staffProfileSaved: session.staffProfileSaved,
    deliveryAgents: session.deliveryAgents,
  });

  const accessManager = useAccessManager({
    isMainAdmin: session.isMainAdmin,
    adminAccessEntries: session.adminAccessEntries,
    deliveryAccessEntries: session.deliveryAccessEntries,
  });

  const shopTimingManager = useShopTimingManager({
    isAdmin: session.isAdmin,
    isDrawerOpen: profileManager.isStaffProfileOpen,
    shopTiming: session.shopTiming,
  });

  if (isProcessingAuthCallback) {
    return (
      <Suspense fallback={<Loader fullScreen label="Finalizing your Google sign-in..." />}>
        <AuthCallbackPage />
      </Suspense>
    );
  }

  if (!session.isAuthReady) {
    return (
      <Suspense fallback={<Loader fullScreen label="Loading your session..." />}>
        <AuthLoadingPage />
      </Suspense>
    );
  }

  if (!session.isLoggedIn) {
    return (
      <Suspense fallback={<Loader fullScreen label="Preparing sign in..." />}>
        <LoginPage authControls={<SignedOutAuthControls />} />
      </Suspense>
    );
  }

  return (
    <AppRouter
      accessManager={accessManager}
      installPrompt={installPrompt}
      offersState={offersState}
      orderOperations={orderOperations}
      orderStatus={orderStatus}
      profileManager={profileManager}
      pushNotifications={pushNotifications}
      session={session}
      setOrderStatus={setOrderStatus}
      shopTimingManager={shopTimingManager}
      userMenu={signedInUserMenu}
    />
  );
}
