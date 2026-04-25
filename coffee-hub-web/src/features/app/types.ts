import type { ManagedUserRole, UserRole } from '../../../shared/userRole';

export type CustomerTab =
  | 'home'
  | 'menu'
  | 'offers'
  | 'orders'
  | 'tracking'
  | 'about'
  | 'contact';

export type NotificationSettings = {
  orderUpdates: boolean;
  offers: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  orderUpdates: true,
  offers: false,
};

export type CustomerProfile = {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  addresses: string[];
  adminLocation: string;
  vehicleType: AgentVehicleType;
  status: AgentStatus;
  notificationSettings: NotificationSettings;
  createdAt?: string;
  updatedAt?: string;
};

export type { ManagedUserRole, UserRole };
export type StaffRole = Exclude<UserRole, 'customer'>;
export type AgentVehicleType = '' | 'Bike' | 'Scooter' | 'Cycle';
export type AgentStatus = 'Available' | 'Offline';

export type StaffProfile = CustomerProfile & {
  role: StaffRole;
};

export type AccessEntry = {
  id: string;
  uid?: string;
  phone: string;
  role: UserRole;
  accessOnly?: boolean;
};

export type ShopTimingDraft = {
  openTime: string;
  closeTime: string;
};

export type CheckoutStep = 'cart' | 'details' | 'success';
export type SelectedAddressIndex = number | 'new';

export type SavedAddressOption = {
  index: number;
  label: string;
  value: string;
};
