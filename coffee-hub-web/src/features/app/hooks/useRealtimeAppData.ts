import { useAuth } from '../../auth/hooks/useAuth';
import { useAccessRoles } from './useAccessRoles';
import { useDeliveryData } from './useDeliveryData';
import { useMenuData } from './useMenuData';
import { useOrdersData } from './useOrdersData';
import { useProfileData } from './useProfileData';
import { useShopTiming } from './useShopTiming';
import { ADMIN_EMAIL } from '../lib/constants';

export const useRealtimeAppData = () => {
  const auth = useAuth();

  const profiles = useProfileData({
    currentUserEmail: auth.currentUserEmail,
    currentUserId: auth.currentUserId,
    currentUserName: auth.currentUserName,
    isLoggedIn: auth.isLoggedIn,
  });

  const isAdmin = profiles.profileSaved.role === 'admin';
  const isDeliveryAgent = profiles.profileSaved.role === 'agent';
  const isMainAdmin = isAdmin && auth.normalizedCurrentEmail === ADMIN_EMAIL;
  const accessEntries = useAccessRoles(isAdmin);
  const menu = useMenuData(auth.isLoggedIn);
  const orders = useOrdersData(isAdmin, auth.currentUserId);
  const shopTiming = useShopTiming();
  const delivery = useDeliveryData(
    isAdmin,
    isDeliveryAgent,
    auth.normalizedCurrentEmail,
  );

  return {
    // Auth
    isLoggedIn: auth.isLoggedIn,
    isAuthReady: auth.isAuthReady && profiles.isProfileReady,
    currentUserId: auth.currentUserId,
    currentUserEmail: auth.currentUserEmail,
    normalizedCurrentEmail: auth.normalizedCurrentEmail,

    // Roles
    isAdmin,
    isDeliveryAgent,
    isMainAdmin,
    adminAccessEntries: accessEntries.adminAccessEntries,
    deliveryAccessEntries: accessEntries.deliveryAccessEntries,

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
