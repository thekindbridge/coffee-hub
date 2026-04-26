import { Suspense, useEffect, useState } from 'react';
import type { Order } from '../types';
import { useOffers } from '../features/offers/hooks/useOffers';
import { useRealtimeAppData } from '../features/app/hooks/useRealtimeAppData';
import { useNetworkStatus } from '../features/app/hooks/useNetworkStatus';
import { useOrderOperations } from '../features/orders/hooks/useOrderOperations';
import { useProfileManager } from '../features/app/hooks/useProfileManager';
import { useAccessManager } from '../features/app/hooks/useAccessManager';
import { usePushNotifications } from '../features/app/hooks/usePushNotifications';
import { useShopTimingManager } from '../features/app/hooks/useShopTimingManager';
import { useInstallPrompt } from '../features/customer/hooks/useInstallPrompt';
import { Loader } from '../components/ui/Loader';
import { NetworkStatusBanner } from '../components/common/NetworkStatusBanner';
import { lazyNamed } from '../utils/lazyNamed';
import { AppRouter } from './router/AppRouter';
import { storageAdapter } from '../services/platform/storageAdapter';

const NOTIFICATION_PERMISSION_REQUESTED_KEY = 'notification_permission_requested';

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
  const networkStatus = useNetworkStatus();

  const pushNotifications = usePushNotifications({
    isAuthReady: session.isAuthReady,
    isLoggedIn: session.isLoggedIn,
    currentUserId: session.currentUserId,
    currentUserPhone: session.currentUserPhone,
    isDeliveryAgent: session.isDeliveryAgent,
    role: session.role,
  });

  useEffect(() => {
    if (!session.isAuthReady || !pushNotifications.isSupported) {
      return;
    }

    if (pushNotifications.permissionState !== 'default') {
      return;
    }

    if (storageAdapter.read(NOTIFICATION_PERMISSION_REQUESTED_KEY) === 'true') {
      return;
    }

    storageAdapter.write(NOTIFICATION_PERMISSION_REQUESTED_KEY, 'true');
    void pushNotifications.requestPermission();
  }, [
    pushNotifications,
    pushNotifications.isSupported,
    pushNotifications.permissionState,
    session.isAuthReady,
  ]);

  const offersState = useOffers({
    enabled: session.isAuthResolved,
    includeInactive: session.canAccessAdminPanel,
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
    isAdmin: session.canAccessAdminPanel,
    isDeliveryAgent: session.isDeliveryAgent,
    profileSaved: session.profileSaved,
    deliveryAgents: session.deliveryAgents,
  });

  const accessManager = useAccessManager({
    canManageRoles: session.canManageRoles,
  });

  const shopTimingManager = useShopTimingManager({
    isAdmin: session.canAccessAdminPanel,
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
    <>
      <NetworkStatusBanner isOffline={networkStatus.isOffline} />
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
    </>
  );
}
