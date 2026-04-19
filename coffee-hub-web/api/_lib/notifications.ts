import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { normalizeOrderStatusCode, type OrderStatusCode } from '../../shared/orderStatus.js';
import { getAdminMessaging, hasAdminAccess } from './firebaseAdmin.js';

export type NotificationPreferenceKey = 'orderUpdates' | 'offers';

export type StoredNotificationSettings = {
  orderUpdates: boolean;
  offers: boolean;
};

type NotificationTokenType = 'expo' | 'fcm';

type NotificationRecipient = {
  fcmToken?: string;
  pushToken?: string;
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
  orderId?: string;
  status?: OrderStatusCode;
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
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100;
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
  const fcmToken = typeof data.fcmToken === 'string' ? data.fcmToken.trim() : '';
  const pushToken = typeof data.pushToken === 'string' ? data.pushToken.trim() : '';

  if (!fcmToken && !pushToken) {
    return null;
  }

  return {
    ...(fcmToken ? { fcmToken } : {}),
    ...(pushToken ? { pushToken } : {}),
    settings: normalizeNotificationSettings(data.notificationSettings),
    userDocId: snapshot.id,
  };
};

const buildRecipientFromAgentSnapshot = (
  snapshot: QueryDocumentSnapshot,
): NotificationRecipient | null => {
  const data = snapshot.data() as Record<string, unknown>;
  const fcmToken = typeof data.fcmToken === 'string' ? data.fcmToken.trim() : '';
  if (!fcmToken) {
    return null;
  }

  return {
    fcmToken,
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
  ...(content.orderId ? { orderId: content.orderId } : {}),
  preferenceKey: content.preferenceKey,
  ...(content.status ? { status: content.status } : {}),
  tag: content.tag || 'coffee-hub',
  title: content.title,
  url: normalizeUrl(content.url || '/'),
});

const isInvalidFcmTokenErrorCode = (code: string) =>
  code === 'messaging/registration-token-not-registered' ||
  code === 'messaging/invalid-registration-token' ||
  code === 'messaging/mismatched-credential';

const isExpoPushToken = (token: string) =>
  token.startsWith('ExpoPushToken[') || token.startsWith('ExponentPushToken[');

const isInvalidExpoTicketErrorCode = (code: string) =>
  code === 'DeviceNotRegistered' ||
  code === 'ExpoPushTokenInvalid';

const chunkTargets = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const clearInvalidRecipientToken = async (
  adminDb: Firestore,
  recipient: NotificationRecipient,
  tokenType: NotificationTokenType,
) => {
  const updates: Promise<unknown>[] = [];
  const tokenField = tokenType === 'expo' ? 'pushToken' : 'fcmToken';
  const tokenTimestampField = tokenType === 'expo' ? 'pushTokenUpdatedAt' : 'fcmTokenUpdatedAt';

  if (recipient.userDocId) {
    updates.push(
      adminDb.collection('users').doc(recipient.userDocId).set(
        {
          [tokenField]: FieldValue.delete(),
          [tokenTimestampField]: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }

  if (recipient.agentDocId && tokenType === 'fcm') {
    updates.push(
      adminDb.collection('agents').doc(recipient.agentDocId).set(
        {
          fcmToken: FieldValue.delete(),
          fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
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
    tokenType = 'fcm',
    userId,
  }: {
    email: string;
    permission: 'default' | 'denied' | 'granted';
    token: string;
    tokenType?: NotificationTokenType;
    userId: string;
  },
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedToken = token.trim();
  const tokenField = tokenType === 'expo' ? 'pushToken' : 'fcmToken';
  const tokenTimestampField = tokenType === 'expo'
    ? 'pushTokenUpdatedAt'
    : 'fcmTokenUpdatedAt';
  const userRef = adminDb.collection('users').doc(userId);
  const userSnapshot = await userRef.get();
  const existingSettings = normalizeNotificationSettings(
    userSnapshot.data()?.notificationSettings,
  );

  const agentSnapshot = normalizedEmail
    ? await adminDb.collection('agents').doc(normalizedEmail).get()
    : null;
  const existingRole = userSnapshot.data()?.role;
  const role = existingRole === 'admin' || existingRole === 'agent'
    ? existingRole
    : await hasAdminAccess(normalizedEmail)
      ? 'admin'
      : 'customer';

  if (normalizedToken) {
    const [duplicateUsers, duplicateAgents] = await Promise.all([
      adminDb.collection('users').where(tokenField, '==', normalizedToken).get(),
      tokenType === 'fcm'
        ? adminDb.collection('agents').where('fcmToken', '==', normalizedToken).get()
        : Promise.resolve(null),
    ]);

    await Promise.all([
      ...duplicateUsers.docs
        .filter(snapshot => snapshot.id !== userId)
        .map(snapshot =>
          snapshot.ref.set(
            {
              [tokenField]: FieldValue.delete(),
              [tokenTimestampField]: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          )),
      ...(duplicateAgents?.docs || [])
        .filter(snapshot => snapshot.id !== normalizedEmail)
        .map(snapshot =>
          snapshot.ref.set(
            {
              fcmToken: FieldValue.delete(),
              fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          )),
    ]);
  }

  const userUpdate: Record<string, unknown> = {
    email: normalizedEmail,
    notificationPermission: permission,
    notificationSettings: existingSettings,
    role,
    updatedAt: FieldValue.serverTimestamp(),
  };

  userUpdate[tokenField] = normalizedToken || FieldValue.delete();
  userUpdate[tokenTimestampField] = FieldValue.serverTimestamp();

  await userRef.set(userUpdate, { merge: true });

  if (role === 'agent' && normalizedEmail && tokenType === 'fcm') {
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

type NotificationTarget = {
  recipient: NotificationRecipient;
  token: string;
  tokenType: NotificationTokenType;
};

const buildNotificationTargets = (recipient: NotificationRecipient): NotificationTarget[] => {
  const targets: NotificationTarget[] = [];

  if (recipient.fcmToken) {
    targets.push({
      recipient,
      token: recipient.fcmToken,
      tokenType: 'fcm',
    });
  }

  if (recipient.pushToken && isExpoPushToken(recipient.pushToken)) {
    targets.push({
      recipient,
      token: recipient.pushToken,
      tokenType: 'expo',
    });
  }

  return targets;
};

const sendExpoPushNotifications = async (
  adminDb: Firestore,
  targets: NotificationTarget[],
  content: PushMessageContent,
) => {
  let delivered = 0;

  for (const targetChunk of chunkTargets(targets, EXPO_PUSH_CHUNK_SIZE)) {
    let response: Response;

    try {
      response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          targetChunk.map(target => ({
            body: content.body,
            channelId: 'order-updates',
            data: buildPushDataPayload(content),
            sound: 'default',
            title: content.title,
            to: target.token,
          })),
        ),
      });
    } catch {
      continue;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      continue;
    }

    const ticketData = Array.isArray((payload as { data?: unknown[] }).data)
      ? (payload as { data: Array<Record<string, unknown>> }).data
      : [];
    const cleanupTasks: Promise<unknown>[] = [];

    ticketData.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        delivered += 1;
        return;
      }

      const errorCode = typeof ticket.details === 'object' && ticket.details
        ? `${(ticket.details as { error?: unknown }).error || ''}`.trim()
        : '';
      const target = targetChunk[index];

      if (target && isInvalidExpoTicketErrorCode(errorCode)) {
        cleanupTasks.push(
          clearInvalidRecipientToken(adminDb, target.recipient, 'expo'),
        );
      }
    });

    if (cleanupTasks.length > 0) {
      await Promise.all(cleanupTasks);
    }
  }

  return {
    attempted: targets.length,
    delivered,
  };
};

export const sendPushNotification = async (
  adminDb: Firestore,
  recipients: NotificationRecipient[],
  content: PushMessageContent,
) => {
  const eligibleTargets = recipients
    .filter(recipient =>
      shouldDeliverToRecipient(recipient, content.preferenceKey),
    )
    .flatMap(buildNotificationTargets);

  if (eligibleTargets.length === 0) {
    return { attempted: 0, delivered: 0 };
  }

  const fcmTargets = eligibleTargets.filter(target => target.tokenType === 'fcm');
  const expoTargets = eligibleTargets.filter(target => target.tokenType === 'expo');

  let delivered = 0;

  if (fcmTargets.length > 0) {
    const response = await getAdminMessaging().sendEach(
      fcmTargets.map(target => ({
        data: buildPushDataPayload(content),
        token: target.token,
        webpush: {
          headers: {
            Urgency: content.urgency || 'high',
          },
        },
      })),
    );

    delivered += response.successCount;

    await Promise.all(response.responses.map(async (result, index) => {
      if (result.success) {
        return;
      }

      const errorCode = result.error?.code || '';
      if (isInvalidFcmTokenErrorCode(errorCode)) {
        await clearInvalidRecipientToken(adminDb, fcmTargets[index].recipient, 'fcm');
      }
    }));
  }

  if (expoTargets.length > 0) {
    const expoResponse = await sendExpoPushNotifications(adminDb, expoTargets, content);
    delivered += expoResponse.delivered;
  }

  return {
    attempted: eligibleTargets.length,
    delivered,
  };
};

const formatCustomerOrderNumber = (orderId: string) => {
  const trimmedOrderId = orderId.trim();
  const orderSuffix = trimmedOrderId.slice(-4);

  return `#${orderSuffix || trimmedOrderId || '----'}`;
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
  const orderNumber = formatCustomerOrderNumber(orderId);

  switch (normalizedStatus) {
    case 'PENDING':
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} placed successfully \u2615`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'ACCEPTED':
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} accepted \u2615`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'PREPARING':
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} is being prepared \u2615`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'OUT_FOR_DELIVERY':
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} is out for delivery \u{1F69A}`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'DELIVERED':
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} delivered \u2705`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'REJECTED':
      return {
        title: 'Coffee Hub \u2615',
        body: rejectionReason
          ? `Order ${orderNumber} rejected \u274C. Reason: ${rejectionReason}`
          : `Order ${orderNumber} rejected \u274C`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    case 'CANCELLED':
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} cancelled`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        url: buildOrderTrackingUrl(orderId),
      };
    default:
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} updated`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
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

export const buildAdminOrderCancelledNotification = (orderId: string): PushMessageContent => ({
  title: 'Order Cancelled',
  body: `Order #${orderId} was cancelled by the customer.`,
  preferenceKey: 'orderUpdates',
  tag: `admin-order-cancelled-${orderId}`,
  url: '/?scope=admin',
});

export const buildAgentAssignmentNotification = (orderId: string): PushMessageContent => ({
  title: 'New Delivery Assigned',
  body: `You have a new order to deliver. Order #${orderId}`,
  preferenceKey: 'orderUpdates',
  tag: `agent-order-${orderId}`,
  url: '/?scope=agent',
});

export const buildAgentOrderCancelledNotification = (orderId: string): PushMessageContent => ({
  title: 'Delivery Cancelled',
  body: `Assigned order #${orderId} has been cancelled.`,
  preferenceKey: 'orderUpdates',
  tag: `agent-order-cancelled-${orderId}`,
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
        title: `${jobData.title || 'COFFEE-HUB'}`.trim(),
        url: `${jobData.url || '/'}`.trim() || '/',
      });
    }

    await jobDoc.ref.delete();
    processed += 1;
  }

  return processed;
};
