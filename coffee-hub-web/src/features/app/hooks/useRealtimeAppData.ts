/**
 * useRealtimeAppData — thin aggregator hook.
 *
 * Composes all focused sub-hooks into a single return object,
 * preserving the same API as before for backward compatibility.
 *
 * Sub-hooks:
 *   useAuthState      → auth identity
 *   useAccessRoles    → admin/delivery role + access entries
 *   useMenuData       → real-time menu items
 *   useOrdersData     → admin + user orders with item hydration
 *   useProfileData    → customer & staff profile documents
 *   useDeliveryData   → agents, sessions, GPS tracker
 */
import { useAuth } from '../../auth/hooks/useAuth';
import { useAccessRoles } from './useAccessRoles';
import { useMenuData } from './useMenuData';
import { useOrdersData } from './useOrdersData';
import { useProfileData } from './useProfileData';
import { useDeliveryData } from './useDeliveryData';
import { useShopTiming } from './useShopTiming';
import { ADMIN_EMAIL } from '../lib/constants';

export const useRealtimeAppData = () => {
  const auth = useAuth();

  const roles = useAccessRoles(auth.currentUserEmail, auth.normalizedCurrentEmail);

  const menu = useMenuData(auth.isLoggedIn);

  const orders = useOrdersData(roles.isAdmin, auth.currentUserId);

  const shopTiming = useShopTiming();

  const profiles = useProfileData(
    auth.currentUserId,
    roles.isAdmin,
    roles.isDeliveryAgent,
    auth.normalizedCurrentEmail,
    ADMIN_EMAIL,
  );

  const delivery = useDeliveryData(
    roles.isAdmin,
    roles.isDeliveryAgent,
    auth.normalizedCurrentEmail,
  );

  return {
    // Auth
    isLoggedIn: auth.isLoggedIn,
    isAuthReady: auth.isAuthReady,
    currentUserId: auth.currentUserId,
    currentUserEmail: auth.currentUserEmail,
    normalizedCurrentEmail: auth.normalizedCurrentEmail,

    // Roles
    isAdmin: roles.isAdmin,
    isDeliveryAgent: roles.isDeliveryAgent,
    isMainAdmin: roles.isMainAdmin,
    adminAccessEntries: roles.adminAccessEntries,
    deliveryAccessEntries: roles.deliveryAccessEntries,

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

    // Profiles
    profileSaved: profiles.profileSaved,
    staffProfileSaved: profiles.staffProfileSaved,

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
