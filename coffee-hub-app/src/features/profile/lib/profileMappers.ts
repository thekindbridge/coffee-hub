import type {
  AddressLabel,
  CustomerProfile,
  NotificationSettings,
  ProfileAddress,
} from '../../../types';

export const PROFILE_ADDRESS_LABELS: AddressLabel[] = ['Home', 'Work', 'Other'];
export const PROFILE_PROMPT_STORAGE_KEY = 'coffee-hub:profile-prompt-suppressed';

const ADDRESS_LABEL_PRIORITY: Record<AddressLabel, number> = {
  Home: 0,
  Work: 1,
  Other: 2,
};

const isAddressLabel = (value: unknown): value is AddressLabel => (
  value === 'Home' || value === 'Work' || value === 'Other'
);

export const EMPTY_NOTIFICATION_SETTINGS: NotificationSettings = {
  orderUpdates: true,
  promotions: false,
};

export const EMPTY_PROFILE: CustomerProfile = {
  adminLocation: '',
  name: '',
  phone: '',
  email: '',
  addresses: [],
  notificationSettings: EMPTY_NOTIFICATION_SETTINGS,
  staffStatus: '',
  vehicleType: '',
};

export const buildAddressId = (label: AddressLabel) => `address-${label.toLowerCase()}`;

export const stripPhonePrefix = (phone: string) => phone.replace(/^\+91\s*/i, '').trim();

export const formatPhoneWithPrefix = (phone: string) => {
  const trimmed = stripPhonePrefix(phone);
  if (!trimmed) {
    return '';
  }

  return `+91 ${trimmed}`;
};

export const createEmptyAddress = (label: AddressLabel): ProfileAddress => ({
  id: buildAddressId(label),
  label,
  address: '',
  isPrimary: false,
});

export const getAvailableAddressLabels = (addresses: ProfileAddress[]) => {
  const usedLabels = new Set(
    addresses
      .map(address => address.label)
      .filter(label => isAddressLabel(label)),
  );

  return PROFILE_ADDRESS_LABELS.filter(label => !usedLabels.has(label));
};

const sortAddresses = (addresses: ProfileAddress[]) => (
  [...addresses].sort((left, right) => {
    if (left.isPrimary && !right.isPrimary) return -1;
    if (!left.isPrimary && right.isPrimary) return 1;
    return ADDRESS_LABEL_PRIORITY[left.label] - ADDRESS_LABEL_PRIORITY[right.label];
  })
);

const ensureSinglePrimary = (addresses: ProfileAddress[]) => {
  const filledAddresses = addresses.filter(address => address.address.trim());

  if (filledAddresses.length === 0) {
    return addresses.map(address => ({
      ...address,
      isPrimary: false,
    }));
  }

  const primaryId = filledAddresses.find(address => address.isPrimary)?.id || filledAddresses[0].id;

  return addresses.map(address => ({
    ...address,
    isPrimary: address.id === primaryId && address.address.trim().length > 0,
  }));
};

export const sanitizeProfileAddresses = (addresses: ProfileAddress[] = []) => {
  const nextAddresses: ProfileAddress[] = [];
  const usedLabels = new Set<AddressLabel>();

  addresses.forEach(entry => {
    const requestedLabel = isAddressLabel(entry?.label) ? entry.label : null;
    const label = requestedLabel && !usedLabels.has(requestedLabel)
      ? requestedLabel
      : PROFILE_ADDRESS_LABELS.find(candidate => !usedLabels.has(candidate));

    if (!label) {
      return;
    }

    usedLabels.add(label);

    nextAddresses.push({
      id: entry?.id?.trim() || buildAddressId(label),
      label,
      address: `${entry?.address ?? ''}`.trim(),
      isPrimary: Boolean(entry?.isPrimary),
    });
  });

  return sortAddresses(ensureSinglePrimary(nextAddresses)).slice(0, 3);
};

export const normalizeNotificationSettings = (value?: unknown): NotificationSettings => {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_NOTIFICATION_SETTINGS };
  }

  const record = value as Record<string, unknown>;

  return {
    orderUpdates: record.orderUpdates !== false,
    promotions: record.promotions === true || record.offers === true,
  };
};

const mapLegacyAddresses = (value?: unknown): ProfileAddress[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;

  return PROFILE_ADDRESS_LABELS.flatMap((label, index) => {
    const addressKey = `address${index + 1}` as const;
    const address = `${record[addressKey] ?? ''}`.trim();

    if (!address) {
      return [];
    }

    return [{
      id: buildAddressId(label),
      label,
      address,
      isPrimary: index === 0,
    }];
  });
};

const mapAddressEntries = (value?: unknown): ProfileAddress[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const label = isAddressLabel(record.label) ? record.label : null;

    if (!label) {
      return [];
    }

    return [{
      id: `${record.id ?? buildAddressId(label)}`.trim() || buildAddressId(label),
      label,
      address: `${record.address ?? ''}`.trim(),
      isPrimary: record.isPrimary === true,
    }];
  });
};

export const mapProfileDocToProfile = (
  data?: Record<string, unknown>,
  fallbackEmail = '',
): CustomerProfile => {
  if (!data) {
    return {
      ...EMPTY_PROFILE,
      email: fallbackEmail,
    };
  }

  const entryAddresses = mapAddressEntries(data.addressEntries);
  const legacyAddresses = mapLegacyAddresses(data.addresses);

  return {
    adminLocation: `${data.adminLocation ?? ''}`.trim(),
    name: `${data.name ?? ''}`.trim(),
    phone: stripPhonePrefix(`${data.phone ?? ''}`),
    email: `${data.email ?? fallbackEmail}`.trim(),
    addresses: sanitizeProfileAddresses(
      entryAddresses.length > 0 ? entryAddresses : legacyAddresses,
    ),
    notificationSettings: normalizeNotificationSettings(data.notificationSettings),
    staffStatus: `${data.status ?? ''}`.trim(),
    vehicleType: `${data.vehicleType ?? data.vehicle ?? ''}`.trim(),
  };
};

export const getPrimaryProfileAddress = (profile: CustomerProfile) => (
  profile.addresses.find(address => address.isPrimary && address.address.trim())
  || profile.addresses.find(address => address.address.trim())
  || null
);

export const getProfileMissingFields = (profile: CustomerProfile) => {
  const missingFields: string[] = [];

  if (!profile.name.trim()) {
    missingFields.push('name');
  }

  if (!profile.phone.trim()) {
    missingFields.push('phone');
  }

  if (!getPrimaryProfileAddress(profile)?.address.trim()) {
    missingFields.push('address');
  }

  return missingFields;
};

export const isProfileComplete = (profile: CustomerProfile) => (
  getProfileMissingFields(profile).length === 0
);

export const getProfileDisplayName = (
  profile: CustomerProfile,
  authDisplayName = '',
  authEmail = '',
) => {
  const trimmedProfileName = profile.name.trim();
  if (trimmedProfileName) {
    return trimmedProfileName;
  }

  const trimmedAuthName = authDisplayName.trim();
  if (trimmedAuthName) {
    return trimmedAuthName;
  }

  const emailPrefix = authEmail.trim().split('@')[0];
  return emailPrefix || 'COFFEE-HUB User';
};

export const getProfileInitials = (label: string) => {
  const words = label
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return 'CH';
  }

  const initials = words.slice(0, 2).map(word => word[0]?.toUpperCase() || '');
  return initials.join('') || 'CH';
};

export const sanitizeProfileDraft = (
  profileDraft: CustomerProfile,
  fallbackEmail = '',
): CustomerProfile => ({
  adminLocation: `${profileDraft.adminLocation ?? ''}`.trim(),
  name: profileDraft.name.trim(),
  phone: stripPhonePrefix(profileDraft.phone),
  email: profileDraft.email.trim() || fallbackEmail.trim(),
  addresses: sanitizeProfileAddresses(profileDraft.addresses),
  notificationSettings: {
    orderUpdates: profileDraft.notificationSettings.orderUpdates !== false,
    promotions: profileDraft.notificationSettings.promotions === true,
  },
  staffStatus: `${profileDraft.staffStatus ?? ''}`.trim(),
  vehicleType: `${profileDraft.vehicleType ?? ''}`.trim(),
});

export const buildProfileStoragePayload = (
  profileDraft: CustomerProfile,
  fallbackEmail = '',
) => {
  const sanitizedProfile = sanitizeProfileDraft(profileDraft, fallbackEmail);
  const primaryFirstAddresses = sortAddresses(sanitizedProfile.addresses);

  return {
    name: sanitizedProfile.name,
    phone: formatPhoneWithPrefix(sanitizedProfile.phone),
    email: sanitizedProfile.email,
    notificationSettings: {
      orderUpdates: sanitizedProfile.notificationSettings.orderUpdates,
      offers: sanitizedProfile.notificationSettings.promotions,
      promotions: sanitizedProfile.notificationSettings.promotions,
    },
    addresses: {
      address1: primaryFirstAddresses[0]?.address || '',
      address2: primaryFirstAddresses[1]?.address || '',
      address3: primaryFirstAddresses[2]?.address || '',
    },
    addressEntries: primaryFirstAddresses.map(address => ({
      id: address.id,
      label: address.label,
      address: address.address,
      isPrimary: address.isPrimary,
    })),
  };
};
