import type { CheckoutPaymentOption, Order } from '../../../types';
import type { AgentTrackerStatus } from '../../../agent/agentTracker';

export const ORDER_STATUSES: Order['status'][] = [
  'Pending',
  'Preparing',
  'Out for Delivery',
  'Delivered',
];

export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
export const CURRENCY_SYMBOL = '\u20B9';
export const STANDARD_DELIVERY_FEE = 50;
export const AUTH_BACKGROUND_IMAGE =
  'url(https://res.cloudinary.com/ddfhaqeme/image/upload/v1772713816/5f272fcd-02a1-4f33-b91c-9ff009e08610_z4faz2.jpg)';
export const CHECKOUT_PAYMENT_OPTIONS: CheckoutPaymentOption[] = [
  'Pay Online',
  'Cash on Delivery',
];
export const RAZORPAY_KEY_ID = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();
export const DEFAULT_TRACKER_STATUS: AgentTrackerStatus = {
  lifecycle: 'idle',
  message: 'Start delivery to begin live GPS streaming.',
};
