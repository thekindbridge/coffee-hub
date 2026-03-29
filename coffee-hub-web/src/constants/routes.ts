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

export const ADMIN_SECTIONS = ['dashboard', 'products', 'orders', 'promos'] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const AGENT_TABS = ['active', 'history'] as const;

export type AgentTab = (typeof AGENT_TABS)[number];
