import { Suspense, useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { Order } from '../types';
import { useOffers } from '../features/offers/hooks/useOffers';
import { useRealtimeAppData } from '../features/app/hooks/useRealtimeAppData';
import { useNetworkStatus } from '../features/app/hooks/useNetworkStatus';
import { useOrderOperations } from '../features/orders/hooks/useOrderOperations';
import { useProfileCompletionReminder } from '../features/app/hooks/useProfileCompletionReminder';
import { useProfileManager } from '../features/app/hooks/useProfileManager';
import { useAccessManager } from '../features/app/hooks/useAccessManager';
import { usePushNotifications } from '../features/app/hooks/usePushNotifications';
import { useShopTimingManager } from '../features/app/hooks/useShopTimingManager';
import { useInstallPrompt } from '../features/customer/hooks/useInstallPrompt';
import { ProfileCompletionPrompt } from '../components/common/ProfileCompletionPrompt';
import { Loader } from '../components/ui/Loader';
import { NetworkStatusBanner } from '../components/common/NetworkStatusBanner';
import { lazyNamed } from '../utils/lazyNamed';
import { AppRouter } from './router/AppRouter';
import { storageAdapter } from '../services/platform/storageAdapter';

const NOTIFICATION_PERMISSION_REQUESTED_KEY = 'notification_permission_requested';
const COFFEE_HUB_APP_HOST = 'coffee-hub-inkollu.vercel.app';

const getNotificationPermissionRequestedKey = (currentUserId: string) =>
  currentUserId
    ? `${NOTIFICATION_PERMISSION_REQUESTED_KEY}:${currentUserId}`
    : NOTIFICATION_PERMISSION_REQUESTED_KEY;

const normalizeNativeAppUrl = (rawUrl: string) => {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    return '';
  }

  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol === 'https:' && parsedUrl.host === COFFEE_HUB_APP_HOST) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || '/';
    }
  } catch {
    return '';
  }

  return '';
};

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || typeof window === 'undefined') {
      return;
    }

    let isDisposed = false;
    const navigateToNativeAppUrl = (nextUrl: string) => {
      const normalizedUrl = normalizeNativeAppUrl(nextUrl);
      if (!normalizedUrl) {
        return;
      }

      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentUrl === normalizedUrl) {
        return;
      }

      window.location.assign(normalizedUrl);
    };

    void CapacitorApp.getLaunchUrl()
      .then(result => {
        if (!isDisposed && result?.url) {
          navigateToNativeAppUrl(result.url);
        }
      })
      .catch(() => undefined);

    const appUrlOpenListener = CapacitorApp.addListener('appUrlOpen', event => {
      if (!isDisposed && event.url) {
        navigateToNativeAppUrl(event.url);
      }
    });

    return () => {
      isDisposed = true;
      void appUrlOpenListener.then(listener => listener.remove());
    };
  }, []);

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

    const permissionRequestKey = getNotificationPermissionRequestedKey(session.currentUserId);
    if (storageAdapter.read(permissionRequestKey) === 'true') {
      return;
    }

    storageAdapter.write(permissionRequestKey, 'true');
    void pushNotifications.requestPermission();
  }, [
    session.currentUserId,
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
    agentOrders: session.agentOrders,
    userOrders: session.userOrders,
    setUserOrders: session.setUserOrders,
    orderStatus,
    setOrderStatus,
    setNewOrderDocIds: session.setNewOrderDocIds,
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

  const profileCompletionReminder = useProfileCompletionReminder({
    currentUserId: session.currentUserId,
    isAuthReady: session.isAuthReady,
    isLoggedIn: session.isLoggedIn,
    isProfileOpen: profileManager.isProfileOpen,
    isCustomer: session.role === 'customer',
    profileSaved: session.profileSaved,
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
      <ProfileCompletionPrompt
        error={profileCompletionReminder.error}
        isOpen={profileCompletionReminder.isVisible}
        isSavingPreference={profileCompletionReminder.isSavingPreference}
        onCompleteProfile={() => {
          profileCompletionReminder.dismissForSession();
          profileManager.handleOpenProfile();
        }}
        onDisableReminder={() => {
          void profileCompletionReminder.disableReminder();
        }}
        onRemindLater={profileCompletionReminder.remindLater}
      />
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
