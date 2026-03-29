import { Suspense, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { RoleHeader } from '../../components/common/RoleHeader';
import { AppShellLayout } from '../../components/ui/AppShellLayout';
import { Loader } from '../../components/ui/Loader';
import { lazyNamed } from '../../utils/lazyNamed';
import type { ShellSharedProps } from './types';

const StaffProfileDrawer = lazyNamed(
  () => import('../../features/staff/components/StaffProfileDrawer'),
  'StaffProfileDrawer',
);
const AgentDashboardPage = lazyNamed(
  () => import('../../pages/AgentDashboard/AgentDashboardPage'),
  'AgentDashboardPage',
);

export const AgentAppShell = ({
  accessManager,
  orderOperations,
  profileManager,
  pushNotifications,
  session,
  shopTimingManager,
}: ShellSharedProps) => {
  const [hasLoadedStaffDrawer, setHasLoadedStaffDrawer] = useState(false);

  useEffect(() => {
    if (profileManager.isStaffProfileOpen) {
      setHasLoadedStaffDrawer(true);
    }
  }, [profileManager.isStaffProfileOpen]);

  const staffDrawerProps = {
    isOpen: profileManager.isStaffProfileOpen,
    isAdmin: session.isAdmin,
    isDeliveryAgent: session.isDeliveryAgent,
    isMainAdmin: session.isMainAdmin,
    staffProfileDraft: profileManager.staffProfileDraft,
    staffProfileError: profileManager.staffProfileError,
    isStaffProfileSaving: profileManager.isStaffProfileSaving,
    isStaffProfileSavedToastVisible: profileManager.isStaffProfileSavedToastVisible,
    shopTiming: session.shopTiming,
    shopTimingDraft: shopTimingManager.shopTimingDraft,
    shopTimingError: shopTimingManager.shopTimingError,
    shopTimingSuccess: shopTimingManager.shopTimingSuccess,
    isShopTimingSaving: shopTimingManager.isShopTimingSaving,
    adminAccessEntries: session.adminAccessEntries,
    deliveryAccessEntries: session.deliveryAccessEntries,
    adminAccessInput: accessManager.adminAccessInput,
    deliveryAccessInput: accessManager.deliveryAccessInput,
    adminAccessError: accessManager.adminAccessError,
    deliveryAccessError: accessManager.deliveryAccessError,
    adminAccessSuccess: accessManager.adminAccessSuccess,
    deliveryAccessSuccess: accessManager.deliveryAccessSuccess,
    isAdminAccessSaving: accessManager.isAdminAccessSaving,
    isDeliveryAccessSaving: accessManager.isDeliveryAccessSaving,
    adminAccessRemovingId: accessManager.adminAccessRemovingId,
    deliveryAccessRemovingId: accessManager.deliveryAccessRemovingId,
    notificationPermissionState: pushNotifications.permissionState,
    isNotificationSyncing: pushNotifications.isSyncing,
    notificationSyncError: pushNotifications.syncError,
    onClose: () => profileManager.setIsStaffProfileOpen(false),
    onLogout: () => {
      profileManager.setIsStaffProfileOpen(false);
      void orderOperations.handleLogout();
    },
    onEnablePushNotifications: () => {
      void pushNotifications.requestPermission();
    },
    onNotificationSettingsChange: (settings: typeof profileManager.staffProfileDraft.notificationSettings) => {
      void profileManager.handleSaveStaffNotificationSettings(settings);
    },
    onSave: () => void profileManager.handleSaveStaffProfile(),
    onStaffProfileDraftChange: profileManager.setStaffProfileDraft,
    onShopTimingDraftChange: shopTimingManager.handleShopTimingDraftChange,
    onSaveShopTiming: () => void shopTimingManager.handleSaveShopTiming(),
    onAdminAccessInputChange: (value: string) => {
      accessManager.setAdminAccessInput(value);
      if (accessManager.adminAccessError) accessManager.setAdminAccessError('');
      if (accessManager.adminAccessSuccess) accessManager.setAdminAccessSuccess('');
    },
    onDeliveryAccessInputChange: (value: string) => {
      accessManager.setDeliveryAccessInput(value);
      if (accessManager.deliveryAccessError) accessManager.setDeliveryAccessError('');
      if (accessManager.deliveryAccessSuccess) accessManager.setDeliveryAccessSuccess('');
    },
    onAddAdminAccess: () => void accessManager.handleAddAdminAccess(),
    onRemoveAdminAccess: accessManager.handleRemoveAdminAccess,
    onAddDeliveryAccess: () => void accessManager.handleAddDeliveryAccess(),
    onRemoveDeliveryAccess: accessManager.handleRemoveDeliveryAccess,
  };

  return (
    <AppShellLayout
      header={(
        <RoleHeader
          eyebrow="Delivery panel"
          icon={MapPin}
          onProfileClick={profileManager.handleOpenStaffProfile}
          title="Orders on the move"
        />
      )}
      overlays={hasLoadedStaffDrawer ? (
        <Suspense
          fallback={(
            <Loader
              className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm"
              fullScreen
              label="Loading staff profile..."
            />
          )}
        >
          <StaffProfileDrawer {...staffDrawerProps} />
        </Suspense>
      ) : undefined}
    >
      {pushNotifications.isPermissionBannerVisible && (
        <div className="px-4 pt-20 sm:px-6">
          <NotificationPermissionBanner
            isSyncing={pushNotifications.isSyncing}
            onDismiss={pushNotifications.dismissPermissionBanner}
            onEnable={() => {
              void pushNotifications.requestPermission();
            }}
          />
        </div>
      )}

      <Suspense fallback={<Loader label="Loading delivery dashboard..." minHeightClassName="min-h-[420px]" />}>
        <AgentDashboardPage
          activeOrder={session.currentDeliveryOrder}
          deliveryAgent={session.currentDeliveryAgent}
          deliverySession={session.currentDeliverySession}
          isAuthorized={session.isDeliveryAgent}
          isTracking={session.isAgentTracking}
          lastTrackedLocation={session.agentLastTrackedLocation}
          orders={session.agentOrders}
          permissionState={session.agentPermissionState}
          trackerStatus={session.agentTrackerStatus}
          onEndDelivery={orderDocId => { void orderOperations.handleEndDelivery(orderDocId); }}
          onStartDelivery={() => { void orderOperations.handleStartDelivery(); }}
        />
      </Suspense>
    </AppShellLayout>
  );
};
