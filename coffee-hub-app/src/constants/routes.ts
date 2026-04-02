export const ROOT_ROUTES = {
  MAIN_TABS: 'MainTabs',
  CART: 'Cart',
  CHECKOUT_DETAILS: 'CheckoutDetails',
} as const;

export const TAB_ROUTES = {
  HOME: 'Home',
  MENU: 'Menu',
  OFFERS: 'Offers',
  ORDERS: 'Orders',
  PROFILE: 'Profile',
} as const;

export const ADMIN_ROUTES = {
  DASHBOARD: 'AdminDashboard',
  MENU_MANAGEMENT: 'AdminMenuManagement',
  OFFERS_MANAGEMENT: 'AdminOffersManagement',
  ORDERS_MANAGEMENT: 'AdminOrdersManagement',
  PROFILE: 'AdminProfile',
} as const;

export const DELIVERY_ROUTES = {
  ACTIVE_ORDERS: 'DeliveryActiveOrders',
  PROFILE: 'DeliveryProfile',
  STATUS_UPDATE: 'DeliveryStatusUpdate',
  TRACKING: 'DeliveryTracking',
} as const;
