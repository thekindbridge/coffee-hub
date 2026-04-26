import { Suspense, useEffect, useState } from 'react';
import { Bell, User } from 'lucide-react';
import { formatPhoneForDisplay } from '../../../shared/phone';
import { ForegroundNotificationToast } from '../../components/ForegroundNotificationToast';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { RoleHeader } from '../../components/common/RoleHeader';
import { AppShellLayout } from '../../components/ui/AppShellLayout';
import { Loader } from '../../components/ui/Loader';
import { useNotificationHistory } from '../../features/app/hooks/useNotificationHistory';
import { lazyNamed } from '../../utils/lazyNamed';
import type { ShellSharedProps } from './types';

const ProfileScreen = lazyNamed(
  () => import('../../features/profile/ProfileScreen'),
  'ProfileScreen',
);
const AdminDashboardPage = lazyNamed(
  () => import('../../pages/AdminDashboard/AdminDashboardPage'),
  'AdminDashboardPage',
);
const NotificationHistoryPage = lazyNamed(
  () => import('../../pages/Notifications/NotificationHistoryPage'),
  'NotificationHistoryPage',
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
  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false);
  const notificationHistory = useNotificationHistory({
    currentUserId: session.currentUserId,
    isAuthReady: session.isAuthReady,
    isLoggedIn: session.isLoggedIn,
    role: session.role,
  });

  useEffect(() => {
    if (profileManager.isProfileOpen) {
      setHasLoadedStaffDrawer(true);
    }
  }, [profileManager.isProfileOpen]);

  const staffDrawerProps = {
    isOpen: profileManager.isProfileOpen,
    canAccessAdminPanel: session.canAccessAdminPanel,
    isDeliveryAgent: session.isDeliveryAgent,
    isOwner: session.isOwner,
    role: session.role,
    profileDraft: profileManager.profileDraft,
    profileError: profileManager.profileError,
    profileSyncError: session.profileSyncError,
    isProfileAddressExpanded: profileManager.isProfileAddressExpanded,
    isProfileSaving: profileManager.isProfileSaving,
    isProfileSavedToastVisible: profileManager.isProfileSavedToastVisible,
    shopTiming: session.shopTiming,
    shopTimingDraft: shopTimingManager.shopTimingDraft,
    shopTimingError: shopTimingManager.shopTimingError,
    shopTimingSuccess: shopTimingManager.shopTimingSuccess,
    isShopTimingSaving: shopTimingManager.isShopTimingSaving,
    userRoleEntries: session.userRoleEntries,
    roleChangeError: accessManager.roleChangeError,
    roleChangeSuccess: accessManager.roleChangeSuccess,
    pendingRoleAction: accessManager.pendingRoleAction,
    pendingRolePhone: accessManager.pendingRolePhone,
    pendingRoleValue: accessManager.pendingRoleValue,
    notificationPermissionState: pushNotifications.permissionState,
    isNotificationSyncing: pushNotifications.isSyncing,
    notificationSyncError: pushNotifications.syncError,
    onClose: () => profileManager.setIsProfileOpen(false),
    onLogout: () => {
      profileManager.setIsProfileOpen(false);
      void orderOperations.handleLogout();
    },
    onEnablePushNotifications: () => {
      void pushNotifications.requestPermission();
    },
    onNotificationSettingsChange: (settings: typeof profileManager.profileDraft.notificationSettings) => {
      void profileManager.handleSaveProfileNotificationSettings(settings);
    },
    onSave: () => void profileManager.handleSaveProfile(),
    onProfileDraftChange: profileManager.setProfileDraft,
    onProfileAddressExpandedChange: profileManager.setIsProfileAddressExpanded,
    onShopTimingDraftChange: shopTimingManager.handleShopTimingDraftChange,
    onSaveShopTiming: () => void shopTimingManager.handleSaveShopTiming(),
    onAssignUserRole: (phone, role) => {
      if (accessManager.roleChangeError) {
        accessManager.setRoleChangeError('');
      }
      if (accessManager.roleChangeSuccess) {
        accessManager.setRoleChangeSuccess('');
      }
      void accessManager.handleAssignUserRole(phone, role);
    },
    onRemoveUserRole: entry => {
      if (accessManager.roleChangeError) {
        accessManager.setRoleChangeError('');
      }
      if (accessManager.roleChangeSuccess) {
        accessManager.setRoleChangeSuccess('');
      }
      void accessManager.handleRemoveUserRole(entry);
    },
  };

  return (
    <AppShellLayout
      header={(
        <RoleHeader
          eyebrow="Admin console"
          icon={User}
          onProfileClick={profileManager.handleOpenProfile}
          rightSlot={(
            <>
              <button
                type="button"
                onClick={() => setIsNotificationHistoryOpen(true)}
                className="coffee-icon-btn relative"
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {notificationHistory.unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                    {notificationHistory.unreadCount > 9 ? '9+' : notificationHistory.unreadCount}
                  </span>
                )}
              </button>
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-ink-muted sm:block">
                {formatPhoneForDisplay(session.currentUserPhone)}
              </div>
            </>
          )}
          title="COFFEE-HUB operations"
        />
      )}
      overlays={(
        <>
          {hasLoadedStaffDrawer && (
            <Suspense
              fallback={(
                <Loader
                  className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm"
                  fullScreen
                  label="Loading staff profile..."
                />
              )}
            >
              <ProfileScreen {...staffDrawerProps} />
            </Suspense>
          )}
          <ForegroundNotificationToast
            notification={pushNotifications.foregroundNotification}
            onDismiss={pushNotifications.dismissForegroundNotification}
          />
          <NotificationHistoryPage
            error={notificationHistory.error}
            isLoading={notificationHistory.isLoading}
            isMarkingId={notificationHistory.isMarkingId}
            isOpen={isNotificationHistoryOpen}
            notifications={notificationHistory.notifications}
            onClose={() => setIsNotificationHistoryOpen(false)}
            onMarkAsRead={notificationId => {
              void notificationHistory.markAsRead(notificationId);
            }}
          />
        </>
      )}
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
          isOrdersLoading={session.isAdminOrdersLoading}
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
