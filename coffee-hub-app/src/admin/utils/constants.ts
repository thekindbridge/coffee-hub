// Admin email for main admin access
export const ADMIN_EMAIL = 'coffeehubinkollu@gmail.com';

// Currency and pricing
export const CURRENCY_SYMBOL = '\u20B9';
export const STANDARD_DELIVERY_FEE = 50;

// Order statuses for filtering and display
export const ORDER_STATUSES = [
  'Pending',
  'Accepted',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Rejected',
  'Cancelled',
] as const;

// Status colors for UI
export const STATUS_COLORS = {
  Pending: '#FFA500',
  Accepted: '#4CAF50',
  Preparing: '#2196F3',
  'Out for Delivery': '#FF9800',
  Delivered: '#4CAF50',
  Rejected: '#F44336',
  Cancelled: '#F44336',
} as const;

// Menu categories
export const MENU_CATEGORIES = [
  'Coffee',
  'Tea',
  'Snacks',
  'Desserts',
  'Breakfast',
  'Others',
] as const;

// Spice levels
export const SPICE_LEVELS = [0, 1, 2, 3, 4, 5] as const;
