import { Suspense, useMemo, useState } from 'react';
import { Bell, ClipboardList, LayoutDashboard, UserCircle2 } from 'lucide-react';
import { ForegroundNotificationToast } from '../../components/ForegroundNotificationToast';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { AppShellLayout } from '../../components/ui/AppShellLayout';
import { Loader } from '../../components/ui/Loader';
import { DeliveryNavbar } from '../../delivery-agent/components/DeliveryNavbar';
import { DeliveryOrdersScreen } from '../../delivery-agent/pages/DeliveryOrdersScreen';
import { formatAgentAvailabilityLabel } from '../../delivery-agent/utils/orderHelpers';
import { useNotificationHistory } from '../../features/app/hooks/useNotificationHistory';
import type { AgentStatus } from '../../features/app/types';
import { saveDeliveryAgentAvailability } from '../../services/firebase/profileService';
import { lazyNamed } from '../../utils/lazyNamed';
import type { ShellSharedProps } from './types';

type AgentView = 'dashboard' | 'orders';

const DeliveryDashboardPage = lazyNamed(
  () => import('../../delivery-agent/pages/DashboardPage'),
  'DashboardPage',
);
const DeliveryProfilePage = lazyNamed(
  () => import('../../delivery-agent/pages/ProfilePage'),
  'ProfilePage',
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
  const navigationItems = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'orders', label: 'Orders', icon: ClipboardList },
    ] as const,
    [],
  );
  const [activeView, setActiveView] = useState<AgentView>('dashboard');
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
  const availabilityHelperText = isAgentOnline
    ? 'You are live for new deliveries'
    : 'Go online to start receiving tasks';

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
        <header className="app-header-shell sticky left-0 right-0 top-0 z-50 px-4 pb-2.5 backdrop-blur-xl sm:px-6">
          <div className="mx-auto max-w-screen-md">
            <div className="app-header-card rounded-[26px] px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary">
                    Coffee Hub Delivery
                  </p>
                  <h1 className="mt-0.5 truncate text-[1.1rem] font-semibold text-accent sm:text-[1.15rem]">
                    Hi, {firstName}
                  </h1>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        isAgentOnline
                          ? 'border-emerald-400/28 bg-emerald-500/12 text-emerald-200'
                          : 'border-rose-300/24 bg-rose-500/10 text-rose-200'
                      }`}
                    >
                      {availabilityLabel}
                    </span>
                    <p className="truncate text-xs text-ink-muted">
                      {availabilityHelperText}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
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
                    onClick={() => setIsAgentProfileOpen(true)}
                    className={`coffee-icon-btn ${isAgentProfileOpen ? 'border-secondary/35 bg-secondary/12 text-accent' : ''}`}
                    aria-label="Open profile"
                  >
                    <UserCircle2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}
      navigation={(
        <DeliveryNavbar
          activeView={activeView}
          items={navigationItems}
          onChange={nextView => setActiveView(nextView)}
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
          <Suspense fallback={null}>
            <DeliveryProfilePage
              currentUserId={session.currentUserId}
              currentUserPhone={session.currentUserPhone}
              deliveryAgent={session.currentDeliveryAgent}
              isOpen={isAgentProfileOpen}
              onClose={() => setIsAgentProfileOpen(false)}
            />
          </Suspense>
        </>
      )}
    >
      <div className="px-4 pb-32 sm:px-6">
        {pushNotifications.isPermissionBannerVisible && (
          <div className="pb-4">
            <NotificationPermissionBanner
              isSyncing={pushNotifications.isSyncing}
              onDismiss={pushNotifications.dismissPermissionBanner}
              onEnable={() => {
                void pushNotifications.requestPermission();
              }}
            />
          </div>
        )}

        <Suspense fallback={<Loader label="Loading delivery workspace..." minHeightClassName="min-h-[420px]" />}>
          {activeView === 'dashboard' ? (
            <DeliveryDashboardPage
              completedOrders={session.agentCompletedOrders}
              deliveryAgent={session.currentDeliveryAgent}
              inProgressOrders={session.agentInProgressOrders}
              isAuthorized={session.isDeliveryAgent}
              isAvailabilitySaving={isAvailabilitySaving}
              newOrders={session.agentNewOrders}
              onAvailabilityChange={async (nextStatus: AgentStatus) => {
                await persistAvailability(nextStatus);
              }}
            />
          ) : (
            <DeliveryOrdersScreen
              completedOrders={session.agentCompletedOrders}
              inProgressOrders={session.agentInProgressOrders}
              isLoading={session.isAgentOrdersLoading}
              newOrders={session.agentNewOrders}
              ordersError={session.agentOrdersError}
              onMarkDelivered={orderDocId => {
                void orderOperations.handleEndDelivery(orderDocId);
              }}
              onStartDelivery={orderDocId => {
                void orderOperations.handleStartDelivery(orderDocId);
              }}
            />
          )}
        </Suspense>
      </div>
    </AppShellLayout>
  );
};
