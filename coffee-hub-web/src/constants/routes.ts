export const CUSTOMER_TABS = [
  'home',
  'menu',
  'offers',
  'orders',
  'tracking',
  'about',
  'contact',
] as const;

export type CustomerTab = (typeof CUSTOMER_TABS)[number];

export type AdminSection = 'dashboard' | 'products' | 'orders' | 'promos';

export type AgentTab = 'active' | 'history';
