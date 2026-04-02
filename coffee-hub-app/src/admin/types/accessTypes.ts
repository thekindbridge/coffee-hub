export type AccessEntry = {
  id: string;
  email: string;
  role: 'admin' | 'delivery';
  accessOnly?: boolean;
};

export type AccessRolesData = {
  isAdmin: boolean;
  isDeliveryAgent: boolean;
  isMainAdmin: boolean;
  adminAccessEntries: AccessEntry[];
  deliveryAccessEntries: AccessEntry[];
};
