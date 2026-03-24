import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { normalizeOrderStatusCode, type OrderStatusCode } from '../../shared/orderStatus.js';
import { getAdminMessaging, hasAdminAccess } from './firebaseAdmin.js';

export type NotificationPreferenceKey = 'orderUpdates' | 'offers';

export type StoredNotificationSettings = {
  orderUpdates: boolean;
  offers: boolean;
};

type NotificationRecipient = {
  token: string;
  settings: StoredNotificationSettings;
  userDocId?: string;
  agentDocId?: string;
};

type PushMessageContent = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  preferenceKey: NotificationPreferenceKey;
  urgency?: 'high' | 'normal';
};

type QueuedNotificationJob = {
  body: string;
  orderId: string;
  preferenceKey: NotificationPreferenceKey;
  sendAfter: Date;
  tag: string;
  title: string;
  url: string;
  userId: string;
};

const DEFAULT_NOTIFICATION_SETTINGS: StoredNotificationSettings = {
  orderUpdates: true,
  offers: false,
};

const NOTIFICATION_JOB_COLLECTION = 'notification_jobs';
const COLLAPSE_DELAY_MS = 20000;
const buildOrderTrackingUrl = (orderId: string) => `/?tab=tracking&orderId=${encodeURIComponent(orderId)}`;

const normalizeNotificationSettings = (value: unknown): StoredNotificationSettings => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  const data = value as Record<string, unknown>;
  return {
    orderUpdates: data.orderUpdates !== false,
    offers: data.offers === true,
  };
};

const normalizeUrl = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const buildRecipientFromUserSnapshot = (
  snapshot: QueryDocumentSnapshot,
): NotificationRecipient | null => {
  const data = snapshot.data() as Record<string, unknown>;
  const token = typeof data.fcmToken === 'string' ? data.fcmToken.trim() : '';
  if (!token) {
    return null;
  }

  return {
    token,
    settings: normalizeNotificationSettings(data.notificationSettings),
    userDocId: snapshot.id,
  };
};

const buildRecipientFromAgentSnapshot = (
  snapshot: QueryDocumentSnapshot,
): NotificationRecipient | null => {
  const data = snapshot.data() as Record<string, unknown>;
  const token = typeof data.fcmToken === 'string' ? data.fcmToken.trim() : '';
  if (!token) {
    return null;
  }

  return {
    token,
    settings: normalizeNotificationSettings(data.notificationSettings),
    agentDocId: snapshot.id,
  };
};

const shouldDeliverToRecipient = (
  recipient: NotificationRecipient,
  preferenceKey: NotificationPreferenceKey,
) => recipient.settings[preferenceKey] !== false;

const buildPushDataPayload = (content: PushMessageContent) => ({
  body: content.body,
  preferenceKey: content.preferenceKey,
  tag: content.tag || 'coffee-hub',
  title: content.title,
  url: normalizeUrl(content.url || '/'),
});

const isInvalidTokenErrorCode = (code: string) =>
  code === 'messaging/registration-token-not-registered' ||
  code === 'messaging/invalid-registration-token' ||
  code === 'messaging/mismatched-credential';

const clearInvalidRecipientToken = async (
  adminDb: Firestore,
  recipient: NotificationRecipient,
) => {
  const updates: Promise<unknown>[] = [];

  if (recipient.userDocId) {
    updates.push(
      adminDb.collection('users').doc(recipient.userDocId).set(
        {
          fcmToken: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }

  if (recipient.agentDocId) {
    updates.push(
      adminDb.collection('agents').doc(recipient.agentDocId).set(
        {
          fcmToken: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }

  await Promise.all(updates);
};

export const syncNotificationRegistration = async (
  adminDb: Firestore,
  {
    email,
    permission,
    token,
    userId,
  }: {
    email: string;
    permission: 'default' | 'denied' | 'granted';
    token: string;
    userId: string;
  },
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedToken = token.trim();
  const userRef = adminDb.collection('users').doc(userId);
  const userSnapshot = await userRef.get();
  const existingSettings = normalizeNotificationSettings(
    userSnapshot.data()?.notificationSettings,
  );

  const agentSnapshot = normalizedEmail
    ? await adminDb.collection('agents').doc(normalizedEmail).get()
    : null;

  const role = await hasAdminAccess(normalizedEmail)
    ? 'admin'
    : agentSnapshot?.exists
      ? 'agent'
      : 'customer';

  if (normalizedToken) {
    const [duplicateUsers, duplicateAgents] = await Promise.all([
      adminDb.collection('users').where('fcmToken', '==', normalizedToken).get(),
      adminDb.collection('agents').where('fcmToken', '==', normalizedToken).get(),
    ]);

    await Promise.all([
      ...duplicateUsers.docs
        .filter(snapshot => snapshot.id !== userId)
        .map(snapshot =>
          snapshot.ref.set(
            {
              fcmToken: FieldValue.delete(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          )),
      ...duplicateAgents.docs
        .filter(snapshot => snapshot.id !== normalizedEmail)
        .map(snapshot =>
          snapshot.ref.set(
            {
              fcmToken: FieldValue.delete(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          )),
    ]);
  }

  await userRef.set(
    {
      email: normalizedEmail,
      fcmToken: normalizedToken || FieldValue.delete(),
      fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
      notificationPermission: permission,
      notificationSettings: existingSettings,
      role,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (role === 'agent' && normalizedEmail) {
    const existingAgentSettings = normalizeNotificationSettings(
      agentSnapshot?.data()?.notificationSettings,
    );

    await adminDb.collection('agents').doc(normalizedEmail).set(
      {
        email: normalizedEmail,
        fcmToken: normalizedToken || FieldValue.delete(),
        fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
        notificationSettings: existingAgentSettings,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return {
    role,
    settings: existingSettings,
  };
};

export const getCustomerRecipient = async (
  adminDb: Firestore,
  userId: string,
): Promise<NotificationRecipient | null> => {
  const snapshot = await adminDb.collection('users').doc(userId).get();
  if (!snapshot.exists) {
    return null;
  }

  return buildRecipientFromUserSnapshot(snapshot as QueryDocumentSnapshot);
};

export const getAgentRecipient = async (
  adminDb: Firestore,
  agentId: string,
): Promise<NotificationRecipient | null> => {
  const snapshot = await adminDb.collection('agents').doc(agentId).get();
  if (!snapshot.exists) {
    return null;
  }

  return buildRecipientFromAgentSnapshot(snapshot as QueryDocumentSnapshot);
};

export const getAdminRecipients = async (
  adminDb: Firestore,
): Promise<NotificationRecipient[]> => {
  const snapshot = await adminDb.collection('users').where('role', '==', 'admin').get();

  return snapshot.docs
    .map(buildRecipientFromUserSnapshot)
    .filter((recipient): recipient is NotificationRecipient => Boolean(recipient));
};

export const sendPushNotification = async (
  adminDb: Firestore,
  recipients: NotificationRecipient[],
  content: PushMessageContent,
) => {
  const eligibleRecipients = recipients.filter(recipient =>
    shouldDeliverToRecipient(recipient, content.preferenceKey),
  );

  if (eligibleRecipients.length === 0) {
    return { attempted: 0, delivered: 0 };
  }

  const response = await getAdminMessaging().sendEach(
    eligibleRecipients.map(recipient => ({
      data: buildPushDataPayload(content),
      token: recipient.token,
      webpush: {
        headers: {
          Urgency: content.urgency || 'high',
        },
      },
    })),
  );

  await Promise.all(response.responses.map(async (result, index) => {
    if (result.success) {
      return;
    }

    const errorCode = result.error?.code || '';
    if (isInvalidTokenErrorCode(errorCode)) {
      await clearInvalidRecipientToken(adminDb, eligibleRecipients[index]);
    }
  }));

  return {
    attempted: eligibleRecipients.length,
    delivered: response.successCount,
  };
};

export const buildCustomerOrderNotification = ({
  orderId,
  rejectionReason = '',
  status,
}: {
  orderId: string;
  rejectionReason?: string;
  status: OrderStatusCode;
}): PushMessageContent => {
  const normalizedStatus = normalizeOrderStatusCode(status);

  switch (normalizedStatus) {
    case 'PENDING':
      return {
        title: 'Order Confirmed',
        body: 'Your order has been placed successfully.',
        preferenceKey: 'orderUpdates',
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'ACCEPTED':
      return {
        title: 'Order Accepted',
        body: 'Your order is now being prepared.',
        preferenceKey: 'orderUpdates',
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'PREPARING':
      return {
        title: 'Preparing',
        body: 'Your coffee is being freshly prepared.',
        preferenceKey: 'orderUpdates',
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'OUT_FOR_DELIVERY':
      return {
        title: 'On the way',
        body: 'Your order is on the way. Get ready!',
        preferenceKey: 'orderUpdates',
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'DELIVERED':
      return {
        title: 'Delivered',
        body: 'Enjoy your coffee!',
        preferenceKey: 'orderUpdates',
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'REJECTED':
      return {
        title: 'Order Update',
        body: rejectionReason
          ? `Your order was not accepted. Reason: ${rejectionReason}`
          : 'Your order was not accepted.',
        preferenceKey: 'orderUpdates',
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    default:
      return {
        title: 'Order Update',
        body: 'There is an update on your order.',
        preferenceKey: 'orderUpdates',
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
  }
};

export const buildAdminNewOrderNotification = (orderId: string): PushMessageContent => ({
  title: 'New Order Received',
  body: `A new order has been placed. Order #${orderId}`,
  preferenceKey: 'orderUpdates',
  tag: `admin-order-${orderId}`,
  url: '/?scope=admin',
});

export const buildAdminPaymentNotification = (orderId: string): PushMessageContent => ({
  title: 'Payment Received',
  body: `Payment completed for order #${orderId}`,
  preferenceKey: 'orderUpdates',
  tag: `admin-payment-${orderId}`,
  url: '/?scope=admin',
});

export const buildAgentAssignmentNotification = (orderId: string): PushMessageContent => ({
  title: 'New Delivery Assigned',
  body: `You have a new order to deliver. Order #${orderId}`,
  preferenceKey: 'orderUpdates',
  tag: `agent-order-${orderId}`,
  url: '/?scope=agent',
});

export const queueCollapsedCustomerStatusNotification = async (
  adminDb: Firestore,
  job: Omit<QueuedNotificationJob, 'sendAfter'>,
) => {
  await adminDb.collection(NOTIFICATION_JOB_COLLECTION).doc(
    `customer-status-${job.userId}-${job.orderId}`,
  ).set(
    {
      ...job,
      sendAfter: new Date(Date.now() + COLLAPSE_DELAY_MS),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

export const flushQueuedNotifications = async (adminDb: Firestore) => {
  const snapshot = await adminDb.collection(NOTIFICATION_JOB_COLLECTION)
    .orderBy('sendAfter', 'asc')
    .limit(50)
    .get();

  const now = Date.now();
  let processed = 0;

  for (const jobDoc of snapshot.docs) {
    const jobData = jobDoc.data() as Record<string, unknown>;
    const sendAfterValue = jobData.sendAfter;
    const sendAfterDate =
      sendAfterValue &&
      typeof sendAfterValue === 'object' &&
      typeof (sendAfterValue as { toDate?: () => Date }).toDate === 'function'
        ? (sendAfterValue as { toDate: () => Date }).toDate()
        : sendAfterValue instanceof Date
          ? sendAfterValue
          : null;

    if (!sendAfterDate || sendAfterDate.getTime() > now) {
      continue;
    }

    const userId = typeof jobData.userId === 'string' ? jobData.userId : '';
    if (!userId) {
      await jobDoc.ref.delete();
      continue;
    }

    const recipient = await getCustomerRecipient(adminDb, userId);
    if (recipient) {
      await sendPushNotification(adminDb, [recipient], {
        body: `${jobData.body || ''}`.trim(),
        preferenceKey: (jobData.preferenceKey as NotificationPreferenceKey) || 'orderUpdates',
        tag: `${jobData.tag || ''}`.trim(),
        title: `${jobData.title || 'Coffee HUB'}`.trim(),
        url: `${jobData.url || '/'}`.trim() || '/',
      });
    }

    await jobDoc.ref.delete();
    processed += 1;
  }

  return processed;
};
