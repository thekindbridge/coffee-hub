import { useAuth } from '../../auth/hooks/useAuth';
import { useRoleDirectory } from './useRoleDirectory';
import { useDeliveryData } from './useDeliveryData';
import { useMenuData } from './useMenuData';
import { useOrdersData } from './useOrdersData';
import { useProfileData } from './useProfileData';
import { useShopTiming } from './useShopTiming';
import { useUserRole } from './useUserRole';

export const useRealtimeAppData = () => {
  const auth = useAuth();
  const roleState = useUserRole(auth.currentUserPhone);

  const profiles = useProfileData({
    currentUserId: auth.currentUserId,
    currentUserName: auth.currentUserName,
    currentUserPhone: auth.currentUserPhone,
    currentUserRole: roleState.role,
    isAuthReady: auth.isAuthReady,
    isLoggedIn: auth.isLoggedIn,
  });
  const canReadProtectedData = auth.isAuthReady && profiles.isDataAccessReady && auth.isLoggedIn;
  const roleDirectory = useRoleDirectory(canReadProtectedData && roleState.isOwner);
  const menu = useMenuData(auth.isAuthReady);
  const orders = useOrdersData(
    canReadProtectedData && roleState.canAccessAdminPanel,
    canReadProtectedData ? auth.currentUserId : '',
  );
  const shopTiming = useShopTiming(auth.isAuthReady);
  const delivery = useDeliveryData(
    canReadProtectedData && roleState.canAccessAdminPanel,
    canReadProtectedData && roleState.isDeliveryAgent,
    canReadProtectedData ? auth.normalizedCurrentPhone : '',
  );

  return {
    // Auth
    isAuthResolved: auth.isAuthReady,
    isLoggedIn: auth.isLoggedIn,
    isAuthReady: auth.isAuthReady && roleState.isRoleReady && profiles.isProfileReady,
    isDataAccessReady: profiles.isDataAccessReady,
    currentUserId: auth.currentUserId,
    currentUserPhone: auth.currentUserPhone,
    normalizedCurrentPhone: auth.normalizedCurrentPhone,

    // Roles
    role: roleState.role,
    isOwner: roleState.isOwner,
    isAdmin: roleState.isAdmin,
    isDeliveryAgent: roleState.isDeliveryAgent,
    canAccessAdminPanel: roleState.canAccessAdminPanel,
    canManageRoles: roleState.canManageRoles,
    userRoleEntries: roleDirectory.userRoleEntries,
    adminRoleEntries: roleDirectory.adminRoleEntries,
    deliveryAgentRoleEntries: roleDirectory.deliveryAgentRoleEntries,

    // Menu
    menu: menu.menu,
    isMenuLoading: menu.isMenuLoading,

    // Shop timing
    shopTiming: shopTiming.shopTiming,
    isShopTimingLoading: shopTiming.isShopTimingLoading,

    // Orders
    adminOrders: orders.adminOrders,
    setAdminOrders: orders.setAdminOrders,
    newOrderDocIds: orders.newOrderDocIds,
    setNewOrderDocIds: orders.setNewOrderDocIds,
    userOrders: orders.userOrders,
    setUserOrders: orders.setUserOrders,
    isUserOrdersLoading: orders.isUserOrdersLoading,

    // Profile
    profileSaved: profiles.profileSaved,
    profileSyncError: profiles.profileSyncError,

    // Delivery
    deliveryAgents: delivery.deliveryAgents,
    deliverySessions: delivery.deliverySessions,
    agentOrders: delivery.agentOrders,
    agentTrackerRef: delivery.agentTrackerRef,
    trackedOrderIdRef: delivery.trackedOrderIdRef,
    isAgentTracking: delivery.isAgentTracking,
    setIsAgentTracking: delivery.setIsAgentTracking,
    agentPermissionState: delivery.agentPermissionState,
    setAgentPermissionState: delivery.setAgentPermissionState,
    agentTrackerStatus: delivery.agentTrackerStatus,
    setAgentTrackerStatus: delivery.setAgentTrackerStatus,
    agentLastTrackedLocation: delivery.agentLastTrackedLocation,
    setAgentLastTrackedLocation: delivery.setAgentLastTrackedLocation,
    currentDeliveryAgent: delivery.currentDeliveryAgent,
    currentDeliverySession: delivery.currentDeliverySession,
    currentDeliveryOrder: delivery.currentDeliveryOrder,
  };
};
