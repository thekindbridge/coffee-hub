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
} from '../../features/app/types';
import {
  EMPTY_PROFILE,
  ensureProfileAddresses,
  formatPhoneWithPrefix,
  mapProfileDocToProfile,
} from '../../features/app/lib/firestoreMappers';
import { toAppServiceError } from '../platform/serviceError';
import { db } from './index';

export const subscribeToUserProfile = (
  currentUserId: string,
  onData: (profile: CustomerProfile) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'users', currentUserId),
  snapshot => {
    if (!snapshot.exists()) {
      onData({
        ...EMPTY_PROFILE,
        uid: currentUserId,
      });
      return;
    }

    onData(mapProfileDocToProfile(snapshot.data() as Record<string, unknown>));
  },
  error => {
    onError(toAppServiceError(error, 'Unable to load your profile.'));
  },
);

export const saveUserProfile = async ({
  currentUserId,
  currentUserPhone,
  deliveryAgents,
  profileDraft,
}: {
  currentUserId: string;
  currentUserPhone: string;
  deliveryAgents: DeliveryAgent[];
  profileDraft: CustomerProfile;
}) => {
  try {
    const normalizedPhone = formatPhoneWithPrefix(currentUserPhone);
    const trimmedAddresses = ensureProfileAddresses(profileDraft.addresses)
      .map(address => address.trim());
    const userPayload: Record<string, unknown> = {
      addresses: {
        address1: trimmedAddresses[0] || '',
        address2: trimmedAddresses[1] || '',
        address3: trimmedAddresses[2] || '',
      },
      uid: currentUserId,
      email: profileDraft.email.trim(),
      name: profileDraft.name.trim(),
      notificationSettings: profileDraft.notificationSettings,
      phone: normalizedPhone,
      updatedAt: serverTimestamp(),
    };

    if (profileDraft.role === 'admin') {
      userPayload.adminLocation = profileDraft.adminLocation.trim();
    }

    if (profileDraft.role === 'agent') {
      userPayload.status = profileDraft.status;
      userPayload.vehicleType = profileDraft.vehicleType;
    }

    await setDoc(doc(db, 'users', currentUserId), userPayload, { merge: true });

    if (profileDraft.role !== 'agent' || !normalizedPhone) {
      return;
    }

    const existingAgent = deliveryAgents.find(
      agent => agent.id === normalizedPhone || agent.phone === normalizedPhone,
    );
    const shouldMarkOffline = profileDraft.status === 'Offline';
    const shouldPreserveBusyAssignment =
      existingAgent?.status === 'busy' && Boolean(existingAgent.current_order_id);
    const agentStatus = shouldMarkOffline
      ? 'OFFLINE'
      : shouldPreserveBusyAssignment
        ? 'BUSY'
        : 'AVAILABLE';
    const agentPayload: Record<string, unknown> = {
      accessOnly: false,
      isActive: !shouldMarkOffline,
      name: profileDraft.name.trim(),
      notificationSettings: profileDraft.notificationSettings,
      phone: normalizedPhone,
      status: agentStatus,
      updatedAt: serverTimestamp(),
      vehicle: profileDraft.vehicleType,
    };

    if (!existingAgent) {
      agentPayload.createdAt = serverTimestamp();
    }

    await setDoc(doc(db, 'agents', normalizedPhone), agentPayload, { merge: true });
  } catch (error) {
    throw toAppServiceError(error, 'Unable to save your profile.', 'network');
  }
};

export const saveUserNotificationSettings = async ({
  currentUserId,
  currentUserPhone,
  profileDraft,
  settings,
}: {
  currentUserId: string;
  currentUserPhone: string;
  profileDraft: CustomerProfile;
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

    if (profileDraft.role !== 'agent') {
      return;
    }

    const normalizedPhone = formatPhoneWithPrefix(currentUserPhone);
    if (!normalizedPhone) {
      return;
    }

    await setDoc(
      doc(db, 'agents', normalizedPhone),
      {
        notificationSettings: settings,
        phone: normalizedPhone,
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
