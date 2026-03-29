import type { CustomerTab } from '../../constants/routes';

type RequestedCustomerRoute = {
  orderId: string;
  tab: CustomerTab | '';
};

export const getRequestedCustomerRoute = (): RequestedCustomerRoute => {
  if (typeof window === 'undefined') {
    return { orderId: '', tab: '' };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const tab = (searchParams.get('tab') || '').trim().toLowerCase() as CustomerTab | '';
  const orderId = (searchParams.get('orderId') || '').trim().toUpperCase();

  return { orderId, tab };
};

export const clearRequestedCustomerRoute = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
};
