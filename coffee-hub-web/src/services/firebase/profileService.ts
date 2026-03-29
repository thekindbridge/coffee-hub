import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { DeliveryAgent } from '../../types';
import type {
  CustomerProfile,
  NotificationSettings,
  StaffProfile,
  StaffRole,
} from '../../features/app/types';
import {
  EMPTY_PROFILE,
  EMPTY_STAFF_PROFILE,
  ensureProfileAddresses,
  formatPhoneWithPrefix,
  mapProfileDocToProfile,
  mapStaffProfileDocToProfile,
} from '../../features/app/lib/firestoreMappers';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

export const subscribeToCustomerProfile = (
  currentUserId: string,
  onData: (profile: CustomerProfile) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'users', currentUserId),
  snapshot => {
    if (!snapshot.exists()) {
      onData(EMPTY_PROFILE);
      return;
    }

    onData(mapProfileDocToProfile(snapshot.data() as Record<string, unknown>));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load customer profile.'));
  },
);

export const subscribeToStaffProfile = (
  currentUserId: string,
  fallbackRole: StaffRole,
  onData: (profile: StaffProfile) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'users', currentUserId),
  snapshot => {
    if (!snapshot.exists()) {
      onData({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
      return;
    }

    onData(
      mapStaffProfileDocToProfile(
        snapshot.data() as Record<string, unknown>,
        fallbackRole,
      ),
    );
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load staff profile.'));
  },
);

export const saveCustomerProfile = async (
  currentUserId: string,
  profileDraft: CustomerProfile,
) => {
  try {
    const trimmedAddresses = ensureProfileAddresses(profileDraft.addresses).map(address => address.trim());

    await setDoc(
      doc(db, 'users', currentUserId),
      {
        name: profileDraft.name.trim(),
        phone: formatPhoneWithPrefix(profileDraft.phone),
        email: profileDraft.email.trim(),
        notificationSettings: profileDraft.notificationSettings,
        addresses: {
          address1: trimmedAddresses[0] || '',
          address2: trimmedAddresses[1] || '',
          address3: trimmedAddresses[2] || '',
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(error, 'Unable to save your profile.', 'network');
  }
};

export const saveCustomerNotificationSettings = async (
  currentUserId: string,
  settings: NotificationSettings,
) => {
  try {
    await setDoc(
      doc(db, 'users', currentUserId),
      {
        notificationSettings: settings,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to save notification settings right now.',
      'network',
    );
  }
};

export const saveStaffProfile = async ({
  currentUserEmail,
  currentUserId,
  deliveryAgents,
  isAdmin,
  staffProfileDraft,
}: {
  currentUserId: string;
  currentUserEmail: string;
  isAdmin: boolean;
  staffProfileDraft: StaffProfile;
  deliveryAgents: DeliveryAgent[];
}) => {
  try {
    const role: StaffRole = isAdmin ? 'admin' : 'agent';
    const payload: Record<string, unknown> = {
      role,
      name: staffProfileDraft.name.trim(),
      phone: formatPhoneWithPrefix(staffProfileDraft.phone),
      email: staffProfileDraft.email.trim(),
      notificationSettings: staffProfileDraft.notificationSettings,
      updatedAt: serverTimestamp(),
    };

    if (role === 'admin') {
      payload.adminLocation = staffProfileDraft.adminLocation.trim();
    }

    if (role === 'agent') {
      payload.vehicleType = staffProfileDraft.vehicleType;
      payload.status = staffProfileDraft.status;
    }

    await setDoc(doc(db, 'users', currentUserId), payload, { merge: true });

    if (role !== 'agent') {
      return;
    }

    const normalizedEmail = (staffProfileDraft.email || currentUserEmail || '')
      .trim()
      .toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Agent email is required');
    }

    const existingAgent = deliveryAgents.find(
      agent => agent.id === normalizedEmail || agent.email?.toLowerCase() === normalizedEmail,
    );
    const shouldMarkOffline = staffProfileDraft.status === 'Offline';
    const shouldPreserveBusyAssignment =
      existingAgent?.status === 'busy' && Boolean(existingAgent.current_order_id);
    const agentStatus = shouldMarkOffline
      ? 'OFFLINE'
      : shouldPreserveBusyAssignment
        ? 'BUSY'
        : 'AVAILABLE';

    const agentPayload: Record<string, unknown> = {
      name: staffProfileDraft.name.trim(),
      phone: formatPhoneWithPrefix(staffProfileDraft.phone),
      email: normalizedEmail,
      notificationSettings: staffProfileDraft.notificationSettings,
      vehicle: staffProfileDraft.vehicleType,
      status: agentStatus,
      isActive: !shouldMarkOffline,
      role: 'delivery',
      accessOnly: false,
      updatedAt: serverTimestamp(),
    };

    if (!existingAgent) {
      agentPayload.createdAt = serverTimestamp();
    }

    await setDoc(doc(db, 'agents', normalizedEmail), agentPayload, { merge: true });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to save your staff profile.', 'network');
  }
};

export const saveStaffNotificationSettings = async ({
  currentUserEmail,
  currentUserId,
  isAdmin,
  staffProfileDraft,
  settings,
}: {
  currentUserId: string;
  currentUserEmail: string;
  isAdmin: boolean;
  staffProfileDraft: StaffProfile;
  settings: NotificationSettings;
}) => {
  try {
    await setDoc(
      doc(db, 'users', currentUserId),
      {
        notificationSettings: settings,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    if (isAdmin) {
      return;
    }

    const normalizedEmail = (staffProfileDraft.email || currentUserEmail || '')
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    await setDoc(
      doc(db, 'agents', normalizedEmail),
      {
        email: normalizedEmail,
        notificationSettings: settings,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to save notification settings right now.',
      'network',
    );
  }
};
