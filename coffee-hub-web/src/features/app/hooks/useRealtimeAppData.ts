import { useAuth } from '../../auth/hooks/useAuth';
import { useAccessRoles } from './useAccessRoles';
import { useDeliveryData } from './useDeliveryData';
import { useMenuData } from './useMenuData';
import { useOrdersData } from './useOrdersData';
import { useProfileData } from './useProfileData';
import { useShopTiming } from './useShopTiming';
import { ADMIN_PHONE } from '../lib/constants';

export const useRealtimeAppData = () => {
  const auth = useAuth();

  const profiles = useProfileData({
    currentUserId: auth.currentUserId,
    currentUserName: auth.currentUserName,
    currentUserPhone: auth.currentUserPhone,
    isAuthReady: auth.isAuthReady,
    isLoggedIn: auth.isLoggedIn,
  });
  const canReadProtectedData = auth.isAuthReady && profiles.isDataAccessReady && auth.isLoggedIn;

  const isAdmin = profiles.profileSaved.role === 'admin';
  const isDeliveryAgent = profiles.profileSaved.role === 'agent';
  const isMainAdmin = isAdmin && (!ADMIN_PHONE || auth.normalizedCurrentPhone === ADMIN_PHONE);
  const accessEntries = useAccessRoles(canReadProtectedData && isAdmin);
  const menu = useMenuData(auth.isAuthReady);
  const orders = useOrdersData(
    canReadProtectedData && isAdmin,
    canReadProtectedData ? auth.currentUserId : '',
  );
  const shopTiming = useShopTiming(auth.isAuthReady);
  const delivery = useDeliveryData(
    canReadProtectedData && isAdmin,
    canReadProtectedData && isDeliveryAgent,
    canReadProtectedData ? auth.normalizedCurrentPhone : '',
  );

  return {
    // Auth
    isAuthResolved: auth.isAuthReady,
    isLoggedIn: auth.isLoggedIn,
    isAuthReady: auth.isAuthReady && profiles.isProfileReady,
    isDataAccessReady: profiles.isDataAccessReady,
    currentUserId: auth.currentUserId,
    currentUserPhone: auth.currentUserPhone,
    normalizedCurrentPhone: auth.normalizedCurrentPhone,

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
