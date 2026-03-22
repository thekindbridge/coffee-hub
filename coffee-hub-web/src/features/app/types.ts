export type CustomerTab =
  | 'home'
  | 'menu'
  | 'offers'
  | 'orders'
  | 'tracking'
  | 'about'
  | 'contact';

export type CustomerProfile = {
  name: string;
  phone: string;
  email: string;
  addresses: string[];
};

export type StaffRole = 'admin' | 'agent';
export type AgentVehicleType = '' | 'Bike' | 'Scooter' | 'Cycle';
export type AgentStatus = 'Available' | 'Offline';

export type StaffProfile = {
  role: StaffRole;
  name: string;
  phone: string;
  email: string;
  adminLocation: string;
  vehicleType: AgentVehicleType;
  status: AgentStatus;
};

export type AccessEntry = {
  id: string;
  email: string;
  role: 'admin' | 'delivery';
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
