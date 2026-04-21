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
import { lazyNamed } from '../utils/lazyNamed';
import { AppRouter } from './router/AppRouter';

const AuthLoadingPage = lazyNamed(
  () => import('../pages/AuthLoading/AuthLoadingPage'),
  'AuthLoadingPage',
);
const PhoneLoginScreen = lazyNamed(
  () => import('../features/auth/screens/PhoneLoginScreen'),
  'PhoneLoginScreen',
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

  const offersState = useOffers({
    enabled: session.isAuthResolved,
    includeInactive: session.isAdmin,
  });

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
    normalizedCurrentPhone: session.normalizedCurrentPhone,
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
    currentUserPhone: session.currentUserPhone,
    isAdmin: session.isAdmin,
    isDeliveryAgent: session.isDeliveryAgent,
    profileSaved: session.profileSaved,
    deliveryAgents: session.deliveryAgents,
  });

  const accessManager = useAccessManager({
    canManageRoles: session.isAdmin,
    currentUserPhone: session.normalizedCurrentPhone,
    userRoleEntries: session.userRoleEntries,
  });

  const shopTimingManager = useShopTimingManager({
    isAdmin: session.isAdmin,
    isDrawerOpen: profileManager.isProfileOpen,
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
        <PhoneLoginScreen />
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
