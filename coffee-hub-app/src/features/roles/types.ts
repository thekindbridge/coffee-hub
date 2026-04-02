export type AppUserRole = 'customer' | 'admin' | 'delivery';

export type UserRoleState = {
  role: AppUserRole;
  isAdmin: boolean;
  isDelivery: boolean;
  isCustomer: boolean;
  isOwner: boolean;
  loading: boolean;
};

export type RoleAccessEntry = {
  id: string;
  email: string;
  role: 'admin' | 'delivery';
  accessOnly?: boolean;
};
