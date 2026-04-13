import { Suspense, useEffect, useState } from 'react';
import { User } from 'lucide-react';
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
const AdminDashboardPage = lazyNamed(
  () => import('../../pages/AdminDashboard/AdminDashboardPage'),
  'AdminDashboardPage',
);

export const AdminAppShell = ({
  accessManager,
  offersState,
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
          eyebrow="Admin console"
          icon={User}
          onProfileClick={profileManager.handleOpenStaffProfile}
          title="COFFEE-HUB operations"
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

      <Suspense fallback={<Loader label="Loading admin dashboard..." minHeightClassName="min-h-[420px]" />}>
        <AdminDashboardPage
          deliveryAgents={session.deliveryAgents}
          isOffersLoading={offersState.isLoading}
          newOrderDocIds={session.newOrderDocIds}
          offers={offersState.offers}
          offersError={offersState.error}
          orders={session.adminOrders}
          onAssignAgent={async (orderDocId, agentId) => {
            await orderOperations.assignAgentToOrder(orderDocId, agentId);
          }}
          onCreateOffer={offersState.createOffer}
          onDeleteOffer={offersState.deleteOffer}
          onToggleOfferStatus={offersState.toggleOfferStatus}
          onUpdateOffer={offersState.updateOffer}
          onUpdateStatus={async params => {
            await orderOperations.updateOrderStatus(params);
          }}
        />
      </Suspense>
    </AppShellLayout>
  );
};
