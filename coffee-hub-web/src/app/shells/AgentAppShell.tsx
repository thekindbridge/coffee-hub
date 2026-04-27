import { Suspense, useMemo, useState } from 'react';
import { Bell, UserCircle2 } from 'lucide-react';
import { ForegroundNotificationToast } from '../../components/ForegroundNotificationToast';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { AppShellLayout } from '../../components/ui/AppShellLayout';
import { Loader } from '../../components/ui/Loader';
import { formatAgentAvailabilityLabel } from '../../delivery-agent/utils/orderHelpers';
import { useNotificationHistory } from '../../features/app/hooks/useNotificationHistory';
import type { AgentStatus } from '../../features/app/types';
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

  const agentName = useMemo(
    () => session.currentDeliveryAgent?.name?.trim() || session.profileSaved.name.trim() || 'Delivery Partner',
    [session.currentDeliveryAgent?.name, session.profileSaved.name],
  );
  const firstName = useMemo(
    () => agentName.split(/\s+/).filter(Boolean)[0] || 'Partner',
    [agentName],
  );
  const availabilityLabel = formatAgentAvailabilityLabel(session.currentDeliveryAgent);
  const isAgentOnline = availabilityLabel === 'Online';
  const nextAvailabilityStatus: AgentStatus = isAgentOnline ? 'Offline' : 'Available';
  const availabilityHelperText = isAgentOnline
    ? 'Ready for the next pickup'
    : 'Go online to receive delivery tasks';

  const persistAvailability = async (nextStatus: AgentStatus) => {
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
  };

  return (
    <AppShellLayout
      header={(
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/6 bg-[#120d0b]/74 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto max-w-screen-md">
            <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(31,22,19,0.96),rgba(16,11,10,0.96))] px-4 py-3 shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-secondary">
                    Coffee Hub Delivery
                  </p>
                  <h1 className="mt-1 truncate text-[1.2rem] font-semibold text-accent">
                    Hi, {firstName}
                  </h1>
                  <p className="mt-1 text-xs text-ink-muted">
                    {availabilityHelperText}
                  </p>
                </div>

                <div className="flex items-center gap-2">
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

                  <button
                    type="button"
                    onClick={() => {
                      setIsAgentProfileOpen(previous => !previous);
                    }}
                    className={`coffee-icon-btn ${isAgentProfileOpen ? 'border-secondary/35 bg-secondary/12 text-accent' : ''}`}
                    aria-label={isAgentProfileOpen ? 'Show orders' : 'Open profile'}
                  >
                    <UserCircle2 size={18} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void persistAvailability(nextAvailabilityStatus);
                }}
                disabled={isAvailabilitySaving}
                className={`mt-3 flex min-h-12 w-full items-center justify-between rounded-[22px] border px-3.5 py-2.5 text-left transition active:scale-[0.99] ${
                  isAgentOnline
                    ? 'border-emerald-400/25 bg-emerald-500/12 text-emerald-100'
                    : 'border-white/10 bg-white/6 text-ink'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isAgentOnline ? 'bg-emerald-400 shadow-[0_0_0_6px_rgba(74,222,128,0.12)]' : 'bg-rose-300/80'
                    }`}
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                      Availability
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {isAvailabilitySaving ? 'Updating status...' : availabilityLabel}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex h-7 w-12 items-center rounded-full px-1 transition ${
                    isAgentOnline ? 'justify-end bg-emerald-400/25' : 'justify-start bg-white/10'
                  }`}
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow-[0_6px_16px_rgba(0,0,0,0.18)]" />
                </div>
              </button>
            </div>
          </div>
        </header>
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
        <div className="px-4 pt-24 sm:px-6">
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
          isOrdersLoading={session.isAgentOrdersLoading}
          isProfileOpen={isAgentProfileOpen}
          newOrders={session.agentNewOrders}
          ordersError={session.agentOrdersError}
          onAvailabilityChange={async (nextStatus: AgentStatus) => {
            await persistAvailability(nextStatus);
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
