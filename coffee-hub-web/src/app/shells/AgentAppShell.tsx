import { Suspense, useState } from 'react';
import { Bell, MapPin } from 'lucide-react';
import { formatPhoneForDisplay } from '../../../shared/phone';
import { ForegroundNotificationToast } from '../../components/ForegroundNotificationToast';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { RoleHeader } from '../../components/common/RoleHeader';
import { AppShellLayout } from '../../components/ui/AppShellLayout';
import { Loader } from '../../components/ui/Loader';
import type { AgentStatus } from '../../features/app/types';
import { useNotificationHistory } from '../../features/app/hooks/useNotificationHistory';
import { saveDeliveryAgentAvailability } from '../../services/firebase/profileService';
import { lazyNamed } from '../../utils/lazyNamed';
import type { ShellSharedProps } from './types';

const DeliveryDashboardPage = lazyNamed(
  () => import('../../delivery-agent/pages/DashboardPage'),
  'DashboardPage',
);
const NotificationHistoryPage = lazyNamed(
  () => import('../../pages/Notifications/NotificationHistoryPage'),
  'NotificationHistoryPage',
);

export const AgentAppShell = ({
  orderOperations,
  pushNotifications,
  session,
}: ShellSharedProps) => {
  const [isAgentProfileOpen, setIsAgentProfileOpen] = useState(false);
  const [isAvailabilitySaving, setIsAvailabilitySaving] = useState(false);
  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false);
  const notificationHistory = useNotificationHistory({
    currentUserId: session.currentUserId,
    isAuthReady: session.isAuthReady,
    isLoggedIn: session.isLoggedIn,
    role: session.role,
  });

  return (
    <AppShellLayout
      header={(
        <RoleHeader
          eyebrow="Delivery panel"
          icon={MapPin}
          onProfileClick={() => {
            setIsAgentProfileOpen(previous => !previous);
          }}
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
          title="Orders on the move"
        />
      )}
      overlays={(
        <>
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

      <Suspense fallback={<Loader label="Loading delivery dashboard..." minHeightClassName="min-h-[420px]" />}>
        <DeliveryDashboardPage
          completedOrders={session.agentCompletedOrders}
          deliveryAgent={session.currentDeliveryAgent}
          inProgressOrders={session.agentInProgressOrders}
          isAvailabilitySaving={isAvailabilitySaving}
          isAuthorized={session.isDeliveryAgent}
          isProfileOpen={isAgentProfileOpen}
          newOrders={session.agentNewOrders}
          onAvailabilityChange={async (nextStatus: AgentStatus) => {
            setIsAvailabilitySaving(true);
            try {
              await saveDeliveryAgentAvailability({
                currentUserId: session.currentUserId,
                currentUserPhone: session.currentUserPhone,
                deliveryAgents: session.deliveryAgents,
                nextStatus,
                profileDraft: session.profileSaved,
              });
            } finally {
              setIsAvailabilitySaving(false);
            }
          }}
          onProfileToggle={() => {
            setIsAgentProfileOpen(previous => !previous);
          }}
          onEndDelivery={orderDocId => { void orderOperations.handleEndDelivery(orderDocId); }}
          onStartDelivery={orderDocId => { void orderOperations.handleStartDelivery(orderDocId); }}
        />
      </Suspense>
    </AppShellLayout>
  );
};
