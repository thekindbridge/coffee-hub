import type { CustomerTab } from '../../constants/routes';
import {
  clearRequestedCustomerRoute,
  getRequestedCustomerRoute,
} from '../browser/urlStateService';

export type RequestedCustomerRoute = {
  orderId: string;
  tab: CustomerTab | '';
};

export interface UrlStateAdapter {
  clearRequestedCustomerRoute(): void;
  getRequestedCustomerRoute(): RequestedCustomerRoute;
}

export const urlStateAdapter: UrlStateAdapter = {
  clearRequestedCustomerRoute,
  getRequestedCustomerRoute,
};
