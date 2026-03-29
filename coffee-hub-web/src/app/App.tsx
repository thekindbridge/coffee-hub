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
import { loginWithGoogle } from '../services/firebase/authService';
import { Loader } from '../components/ui/Loader';
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

export default function App() {
  const session = useRealtimeAppData();
  const [orderStatus, setOrderStatus] = useState<Order | null>(null);
  const installPrompt = useInstallPrompt();

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
        <LoginPage onLogin={() => { void loginWithGoogle(); }} />
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
    />
  );
}
