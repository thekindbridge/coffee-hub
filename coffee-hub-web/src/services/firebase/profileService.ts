import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { DeliveryAgent, DeliveryLocation } from '../../types';
import type {
  CustomerProfile,
  NotificationSettings,
} from '../../features/app/types';
import {
  canAccessAdminPanel,
  isDeliveryAgentRole,
} from '../../../shared/userRole';
import {
  EMPTY_PROFILE,
  ensureProfileAddresses,
  formatPhoneWithPrefix,
  getPrimaryProfileAddress,
  mapProfileDocToProfile,
} from '../../features/app/lib/firestoreMappers';
import { AppServiceError, toAppServiceError } from '../platform/serviceError';
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
    const primaryAddress = getPrimaryProfileAddress(profileDraft);
    if (primaryAddress) {
      trimmedAddresses[0] = primaryAddress;
    }

    const userPayload: Record<string, unknown> = {
      address: trimmedAddresses[0] || '',
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
      profileReminderDisabled: profileDraft.profileReminderDisabled === true,
      updatedAt: serverTimestamp(),
    };

    if (canAccessAdminPanel(profileDraft.role)) {
      userPayload.adminLocation = profileDraft.adminLocation.trim();
    }

    if (isDeliveryAgentRole(profileDraft.role)) {
      userPayload.status = profileDraft.status;
      userPayload.vehicleType = profileDraft.vehicleType;
    }

    await setDoc(doc(db, 'users', currentUserId), userPayload, { merge: true });

    if (!isDeliveryAgentRole(profileDraft.role) || !normalizedPhone) {
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
      availability: !shouldMarkOffline,
      isActive: !shouldMarkOffline,
      name: profileDraft.name.trim(),
      notificationSettings: profileDraft.notificationSettings,
      phone: normalizedPhone,
      status: agentStatus,
      updatedAt: serverTimestamp(),
      userId: currentUserId,
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

    if (!isDeliveryAgentRole(profileDraft.role)) {
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
        userId: currentUserId,
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

export const saveUserProfileReminderPreference = async ({
  currentUserId,
  disabled,
}: {
  currentUserId: string;
  disabled: boolean;
}) => {
  try {
    await setDoc(
      doc(db, 'users', currentUserId),
      {
        profileReminderDisabled: disabled,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to update your reminder preference right now.',
      'network',
    );
  }
};

export const saveUserDeliveryLocation = async ({
  currentUserId,
  location,
}: {
  currentUserId: string;
  location: DeliveryLocation;
}) => {
  try {
    await setDoc(
      doc(db, 'users', currentUserId),
      {
        location: {
          accuracy: typeof location.accuracy === 'number' ? location.accuracy : null,
          lat: location.lat,
          lng: location.lng,
          updatedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to save your delivery location right now.',
      'network',
    );
  }
};

export const saveUserFcmToken = async ({
  currentUserId,
  currentUserPhone,
  isDeliveryAgent,
  token,
}: {
  currentUserId: string;
  currentUserPhone: string;
  isDeliveryAgent: boolean;
  token: string;
}) => {
  try {
    const normalizedToken = token.trim();
    if (!currentUserId || !normalizedToken) {
      return;
    }

    await setDoc(
      doc(db, 'users', currentUserId),
      {
        fcmToken: normalizedToken,
        fcmTokenUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    if (!isDeliveryAgent) {
      return;
    }

    const normalizedPhone = formatPhoneWithPrefix(currentUserPhone);
    if (!normalizedPhone) {
      return;
    }

    await setDoc(
      doc(db, 'agents', normalizedPhone),
      {
        fcmToken: normalizedToken,
        fcmTokenUpdatedAt: serverTimestamp(),
        phone: normalizedPhone,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to save this device for notifications right now.',
      'network',
    );
  }
};

export const saveDeliveryAgentAvailability = async ({
  currentUserId,
  currentUserPhone,
  deliveryAgents,
  nextStatus,
  profileDraft,
}: {
  currentUserId: string;
  currentUserPhone: string;
  deliveryAgents: DeliveryAgent[];
  nextStatus: 'Available' | 'Offline';
  profileDraft: CustomerProfile;
}) => {
  try {
    const normalizedPhone = formatPhoneWithPrefix(currentUserPhone);
    const existingAgent = deliveryAgents.find(
      agent => agent.id === normalizedPhone || agent.phone === normalizedPhone,
    );
    const shouldMarkOffline = nextStatus === 'Offline';
    const shouldPreserveBusyAssignment =
      existingAgent?.status === 'busy' && Boolean(existingAgent.current_order_id);
    const agentStatus = shouldMarkOffline
      ? 'OFFLINE'
      : shouldPreserveBusyAssignment
        ? 'BUSY'
        : 'AVAILABLE';

    await setDoc(
      doc(db, 'users', currentUserId),
      {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    if (!normalizedPhone) {
      return;
    }

    const agentPayload: Record<string, unknown> = {
      accessOnly: false,
      availability: !shouldMarkOffline,
      isActive: !shouldMarkOffline,
      name: profileDraft.name.trim(),
      phone: normalizedPhone,
      status: agentStatus,
      updatedAt: serverTimestamp(),
      userId: currentUserId,
      vehicle: profileDraft.vehicleType,
    };

    if (!existingAgent) {
      agentPayload.createdAt = serverTimestamp();
    }

    await setDoc(doc(db, 'agents', normalizedPhone), agentPayload, { merge: true });
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to update delivery availability right now.',
      'network',
    );
  }
};

export const saveDeliveryAgentProfileDetails = async ({
  agentId,
  currentUserId,
  name,
  phone,
}: {
  agentId: string;
  currentUserId: string;
  name: string;
  phone: string;
}) => {
  try {
    const normalizedAgentId = formatPhoneWithPrefix(agentId);
    const trimmedName = name.trim();
    const normalizedPhone = formatPhoneWithPrefix(phone);

    if (!trimmedName) {
      throw new AppServiceError('Enter a name before saving.', {
        code: 'validation',
      });
    }

    await Promise.all([
      setDoc(
        doc(db, 'agents', normalizedAgentId),
        {
          name: trimmedName,
          phone: normalizedPhone,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      currentUserId
        ? setDoc(
          doc(db, 'users', currentUserId),
          {
            name: trimmedName,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        : Promise.resolve(),
    ]);
  } catch (error) {
    if (error instanceof AppServiceError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message.trim() : '';
    if (errorMessage === 'Enter a valid mobile number.') {
      throw toAppServiceError(error, errorMessage, 'validation');
    }

    throw toAppServiceError(
      error,
      'Unable to save delivery profile right now.',
      'network',
    );
  }
};
