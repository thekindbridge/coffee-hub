import type { Order } from '../../../types';
import type { AgentTrackerStatus } from '../../../agent/agentTracker';
import {
  ORDER_STATUS_DISPLAY,
  ORDER_STATUS_PROGRESS_FLOW,
} from '../../../../shared/orderStatus';

export const ORDER_STATUSES: Order['status'][] = [
  ...ORDER_STATUS_PROGRESS_FLOW.map(statusCode => ORDER_STATUS_DISPLAY[statusCode]),
  ORDER_STATUS_DISPLAY.REJECTED,
  ORDER_STATUS_DISPLAY.CANCELLED,
];

export const CURRENCY_SYMBOL = '\u20B9';
export const STANDARD_DELIVERY_FEE = 50;
export const AUTH_BACKGROUND_IMAGE =
  'url(https://res.cloudinary.com/ddfhaqeme/image/upload/v1772713816/5f272fcd-02a1-4f33-b91c-9ff009e08610_z4faz2.jpg)';
export const DEFAULT_TRACKER_STATUS: AgentTrackerStatus = {
  lifecycle: 'idle',
  message: 'Start delivery to begin live GPS streaming.',
};
