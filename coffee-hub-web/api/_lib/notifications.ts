import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { safeNormalizePhoneNumber } from '../../shared/phone.js';

import { normalizeOrderStatusCode, type OrderStatusCode } from '../../shared/orderStatus.js';
import { getAdminMessaging } from './firebaseAdmin.js';
import {
  getAdminPhones,
  getUserRole,
} from '../../src/services/api/server/roleService.js';

export type NotificationPreferenceKey = 'orderUpdates' | 'offers';
export type NotificationRecipientRole = 'admin' | 'customer' | 'delivery_agent';

export type StoredNotificationSettings = {
  orderUpdates: boolean;
  offers: boolean;
};

type NotificationTokenType = 'expo' | 'fcm';
export type NotificationTokenPlatform = 'android' | 'web';

type RecipientPushToken = {
  docId: string;
  platform: NotificationTokenPlatform;
  token: string;
  tokenType: NotificationTokenType;
};

type NotificationRecipient = {
  phone?: string;
  role: NotificationRecipientRole;
  settings: StoredNotificationSettings;
  tokens: RecipientPushToken[];
  userDocId?: string;
  agentDocId?: string;
};

type PushMessageContent = {
  title: string;
  body: string;
  eventId?: string;
  type: string;
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
const FCM_TTL_MS = 60 * 60 * 1000;
const PUSH_TOKEN_COLLECTION = 'push_tokens';
const buildOrderTrackingUrl = (orderId: string) => `/?tab=tracking&orderId=${encodeURIComponent(orderId)}`;
const NOTIFICATIONS_COLLECTION = 'notifications';

const normalizeRecipientRole = (value: unknown): NotificationRecipientRole => {
  if (value === 'owner' || value === 'admin') {
    return 'admin';
  }

  if (value === 'delivery_agent' || value === 'agent') {
    return 'delivery_agent';
  }

  return 'customer';
};

const getRoleChannelId = (role: NotificationRecipientRole) => {
  switch (role) {
    case 'admin':
      return 'admin_channel';
    case 'delivery_agent':
      return 'agent_channel';
    default:
      return 'customer_channel';
  }
};

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

const normalizeNotificationTokenType = (value: unknown): NotificationTokenType => (
  value === 'expo'
    ? 'expo'
    : 'fcm'
);

const normalizeNotificationTokenPlatform = (
  value: unknown,
): NotificationTokenPlatform => (
  value === 'android'
    ? 'android'
    : 'web'
);

const buildPushTokenDocumentId = (token: string) =>
  Buffer.from(token.trim(), 'utf8').toString('base64url');

const buildLegacyRecipientTokens = (
  data: Record<string, unknown>,
): RecipientPushToken[] => {
  const legacyTokens: RecipientPushToken[] = [];
  const fcmToken = typeof data.fcmToken === 'string' ? data.fcmToken.trim() : '';
  const pushToken = typeof data.pushToken === 'string' ? data.pushToken.trim() : '';

  if (fcmToken) {
    legacyTokens.push({
      docId: buildPushTokenDocumentId(fcmToken),
      platform: 'android',
      token: fcmToken,
      tokenType: 'fcm',
    });
  }

  if (pushToken && isExpoPushToken(pushToken)) {
    legacyTokens.push({
      docId: buildPushTokenDocumentId(pushToken),
      platform: 'web',
      token: pushToken,
      tokenType: 'expo',
    });
  }

  return legacyTokens;
};

const mergeRecipientTokens = (
  ...tokenGroups: RecipientPushToken[][]
): RecipientPushToken[] => Array.from(
  tokenGroups
    .flat()
    .reduce((accumulator, token) => {
      const key = `${token.tokenType}:${token.token}`;
      if (!accumulator.has(key)) {
        accumulator.set(key, token);
      }
      return accumulator;
    }, new Map<string, RecipientPushToken>())
    .values(),
);

const mapPushTokenSnapshot = (
  snapshot: QueryDocumentSnapshot,
): RecipientPushToken | null => {
  const data = snapshot.data() as Record<string, unknown>;
  if (data.active === false) {
    return null;
  }

  const token = typeof data.token === 'string' ? data.token.trim() : '';
  if (!token) {
    return null;
  }

  return {
    docId: snapshot.id,
    platform: normalizeNotificationTokenPlatform(data.platform),
    token,
    tokenType: normalizeNotificationTokenType(data.tokenType),
  };
};

const buildRecipientFromUserSnapshot = (
  snapshot: QueryDocumentSnapshot,
  registeredTokens: RecipientPushToken[] = [],
): NotificationRecipient => {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    phone: safeNormalizePhoneNumber(`${data.phone || ''}`.trim()),
    role: normalizeRecipientRole(data.role),
    settings: normalizeNotificationSettings(data.notificationSettings),
    tokens: mergeRecipientTokens(buildLegacyRecipientTokens(data), registeredTokens),
    userDocId: snapshot.id,
  };
};

const buildRecipientFromAgentSnapshot = (
  snapshot: QueryDocumentSnapshot,
  registeredTokens: RecipientPushToken[] = [],
  userDocId = '',
): NotificationRecipient => {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    phone: safeNormalizePhoneNumber(`${data.phone || snapshot.id}`.trim()),
    role: 'delivery_agent',
    settings: normalizeNotificationSettings(data.notificationSettings),
    tokens: mergeRecipientTokens(buildLegacyRecipientTokens(data), registeredTokens),
    agentDocId: snapshot.id,
    ...(userDocId ? { userDocId } : {}),
  };
};

const findUserSnapshotByPhone = async (
  adminDb: Firestore,
  phone: string,
) => {
  const normalizedPhone = safeNormalizePhoneNumber(phone);
  if (!normalizedPhone) {
    return null;
  }

  const snapshot = await adminDb
    .collection('users')
    .where('phone', '==', normalizedPhone)
    .limit(1)
    .get();

  return snapshot.docs[0] || null;
};

const shouldDeliverToRecipient = (
  recipient: NotificationRecipient,
  preferenceKey: NotificationPreferenceKey,
) => recipient.settings[preferenceKey] !== false;

const buildPushDataPayload = (
  content: PushMessageContent,
  role: NotificationRecipientRole,
) => ({
  body: content.body,
  channelId: getRoleChannelId(role),
  eventId: resolveNotificationEventId(content),
  ...(content.orderId ? { orderId: content.orderId } : {}),
  preferenceKey: content.preferenceKey,
  recipientRole: role,
  ...(content.status ? { status: content.status } : {}),
  tag: content.tag || 'coffee-hub',
  title: content.title,
  type: content.type,
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

const loadPushTokensForUser = async (
  adminDb: Firestore,
  {
    phone,
    userId,
  }: {
    phone?: string;
    userId?: string;
  },
) => {
  const tasks: Array<Promise<{ docs: QueryDocumentSnapshot[] }>> = [];

  if (userId) {
    tasks.push(
      adminDb.collection(PUSH_TOKEN_COLLECTION)
        .where('userId', '==', userId)
        .get(),
    );
  }

  if (phone) {
    tasks.push(
      adminDb.collection(PUSH_TOKEN_COLLECTION)
        .where('phone', '==', phone)
        .get(),
    );
  }

  if (tasks.length === 0) {
    return [] as RecipientPushToken[];
  }

  const snapshots = await Promise.all(tasks);

  return mergeRecipientTokens(
    ...snapshots.map(snapshot => (
      (snapshot as { docs: QueryDocumentSnapshot[] }).docs
        .map(mapPushTokenSnapshot)
        .filter((token): token is RecipientPushToken => Boolean(token))
    )),
  );
};

type NotificationTarget = {
  docId: string;
  platform: NotificationTokenPlatform;
  recipient: NotificationRecipient;
  token: string;
  tokenType: NotificationTokenType;
};

const clearLegacyTokenReference = async (
  adminDb: Firestore,
  {
    docId,
    collectionName,
    token,
    tokenType,
  }: {
    collectionName: 'agents' | 'users';
    docId: string;
    token: string;
    tokenType: NotificationTokenType;
  },
) => {
  if (!docId) {
    return;
  }

  const tokenField = tokenType === 'expo' ? 'pushToken' : 'fcmToken';
  const tokenTimestampField = tokenType === 'expo'
    ? 'pushTokenUpdatedAt'
    : 'fcmTokenUpdatedAt';
  const docRef = adminDb.collection(collectionName).doc(docId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return;
  }

  const currentValue = typeof snapshot.data()?.[tokenField] === 'string'
    ? snapshot.data()?.[tokenField].trim()
    : '';
  if (currentValue !== token) {
    return;
  }

  await docRef.set(
    {
      [tokenField]: FieldValue.delete(),
      [tokenTimestampField]: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

const clearInvalidRecipientToken = async (
  adminDb: Firestore,
  target: NotificationTarget,
  errorCode = '',
) => {
  const updates: Promise<unknown>[] = [
    adminDb.collection(PUSH_TOKEN_COLLECTION).doc(target.docId).set(
      {
        active: false,
        invalidatedAt: FieldValue.serverTimestamp(),
        lastErrorCode: errorCode || FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  ];

  if (target.recipient.userDocId) {
    updates.push(clearLegacyTokenReference(adminDb, {
      collectionName: 'users',
      docId: target.recipient.userDocId,
      token: target.token,
      tokenType: target.tokenType,
    }));
  }

  if (target.recipient.agentDocId && target.tokenType === 'fcm') {
    updates.push(clearLegacyTokenReference(adminDb, {
      collectionName: 'agents',
      docId: target.recipient.agentDocId,
      token: target.token,
      tokenType: 'fcm',
    }));
  }

  await Promise.all(updates);
};

export const syncNotificationRegistration = async (
  adminDb: Firestore,
  {
    deviceName = '',
    phone,
    permission,
    platform = 'web',
    token,
    tokenType = 'fcm',
    userId,
  }: {
    deviceName?: string;
    phone: string;
    permission: 'default' | 'denied' | 'granted';
    platform?: NotificationTokenPlatform;
    token: string;
    tokenType?: NotificationTokenType;
    userId: string;
  },
) => {
  const normalizedPhone = safeNormalizePhoneNumber(phone);
  const normalizedToken = token.trim();
  const normalizedDeviceName = deviceName.trim().slice(0, 160);
  const normalizedPlatform = normalizeNotificationTokenPlatform(platform);
  const tokenField = tokenType === 'expo' ? 'pushToken' : 'fcmToken';
  const tokenTimestampField = tokenType === 'expo'
    ? 'pushTokenUpdatedAt'
    : 'fcmTokenUpdatedAt';
  const userRef = adminDb.collection('users').doc(userId);
  const userSnapshot = await userRef.get();
  const existingSettings = normalizeNotificationSettings(
    userSnapshot.data()?.notificationSettings,
  );
  const role = normalizedPhone
    ? await getUserRole(adminDb, normalizedPhone)
    : 'customer';
  const notificationRole = normalizeRecipientRole(role);

  const agentSnapshot = normalizedPhone
    ? await adminDb.collection('agents').doc(normalizedPhone).get()
    : null;

  const userUpdate: Record<string, unknown> = {
    notificationPermission: permission,
    notificationSettings: existingSettings,
    phone: normalizedPhone,
    role,
    updatedAt: FieldValue.serverTimestamp(),
  };

  userUpdate[tokenField] = normalizedToken || FieldValue.delete();
  userUpdate[tokenTimestampField] = FieldValue.serverTimestamp();

  await userRef.set(userUpdate, { merge: true });

  if (role === 'delivery_agent' && normalizedPhone && tokenType === 'fcm') {
    const existingAgentSettings = normalizeNotificationSettings(
      agentSnapshot?.data()?.notificationSettings,
    );

    await adminDb.collection('agents').doc(normalizedPhone).set(
      {
        fcmToken: normalizedToken || FieldValue.delete(),
        fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
        notificationSettings: existingAgentSettings,
        phone: normalizedPhone,
        updatedAt: FieldValue.serverTimestamp(),
        userId,
      },
      { merge: true },
    );
  }

  if (normalizedToken) {
    const tokenRef = adminDb.collection(PUSH_TOKEN_COLLECTION).doc(
      buildPushTokenDocumentId(normalizedToken),
    );

    await adminDb.runTransaction(async transaction => {
      const tokenSnapshot = await transaction.get(tokenRef);
      const basePayload: Record<string, unknown> = {
        active: permission === 'granted',
        deviceName: normalizedDeviceName || (
          typeof tokenSnapshot.data()?.deviceName === 'string'
            ? tokenSnapshot.data()?.deviceName
            : ''
        ),
        phone: normalizedPhone,
        platform: normalizedPlatform,
        role: notificationRole,
        token: normalizedToken,
        tokenType,
        updatedAt: FieldValue.serverTimestamp(),
        userId,
      };

      if (permission === 'granted') {
        basePayload.createdAt = tokenSnapshot.exists
          ? tokenSnapshot.data()?.createdAt || FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp();
        basePayload.invalidatedAt = FieldValue.delete();
        basePayload.lastErrorCode = FieldValue.delete();
      } else {
        basePayload.invalidatedAt = FieldValue.serverTimestamp();
      }

      transaction.set(tokenRef, basePayload, { merge: true });
    });
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

  const data = snapshot.data() as Record<string, unknown>;
  const phone = safeNormalizePhoneNumber(`${data.phone || ''}`.trim());
  const registeredTokens = await loadPushTokensForUser(adminDb, {
    phone,
    userId: snapshot.id,
  });

  return buildRecipientFromUserSnapshot(
    snapshot as QueryDocumentSnapshot,
    registeredTokens,
  );
};

export const getAgentRecipient = async (
  adminDb: Firestore,
  agentId: string,
): Promise<NotificationRecipient | null> => {
  const snapshot = await adminDb.collection('agents').doc(agentId).get();
  if (!snapshot.exists) {
    return null;
  }

  const agentData = snapshot.data() as Record<string, unknown>;
  const agentUserId = typeof agentData.userId === 'string'
    ? agentData.userId.trim()
    : '';
  const agentPhone = safeNormalizePhoneNumber(
    `${agentData.phone || snapshot.id}`.trim(),
  );
  const userSnapshot = !agentUserId && agentPhone
    ? await findUserSnapshotByPhone(adminDb, agentPhone)
    : null;
  const registeredTokens = await loadPushTokensForUser(adminDb, {
    phone: agentPhone,
    userId: agentUserId || userSnapshot?.id || '',
  });

  return buildRecipientFromAgentSnapshot(
    snapshot as QueryDocumentSnapshot,
    registeredTokens,
    agentUserId || userSnapshot?.id || '',
  );
};

export const getAdminRecipients = async (
  adminDb: Firestore,
): Promise<NotificationRecipient[]> => {
  const adminPhones = await getAdminPhones(adminDb);
  const snapshots = await Promise.all(
    adminPhones.map(phone => findUserSnapshotByPhone(adminDb, phone)),
  );

  const userSnapshots = snapshots
    .filter((snapshot): snapshot is QueryDocumentSnapshot => Boolean(snapshot))
    .map(snapshot => snapshot as QueryDocumentSnapshot);

  return Promise.all(
    userSnapshots.map(async snapshot => {
      const data = snapshot.data() as Record<string, unknown>;
      const phone = safeNormalizePhoneNumber(`${data.phone || ''}`.trim());
      const registeredTokens = await loadPushTokensForUser(adminDb, {
        phone,
        userId: snapshot.id,
      });

      return buildRecipientFromUserSnapshot(snapshot, registeredTokens);
    }),
  );
};

const buildNotificationTargets = (recipient: NotificationRecipient): NotificationTarget[] => {
  return recipient.tokens.map(token => ({
    docId: token.docId,
    platform: token.platform,
    recipient,
    token: token.token,
    tokenType: token.tokenType,
  }));
};

const buildStableHash = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash || value.length || 1).toString(36);
};

const normalizeEventId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

const resolveNotificationEventId = (content: PushMessageContent) => {
  const explicitEventId = normalizeEventId(content.eventId || '');
  if (explicitEventId) {
    return explicitEventId;
  }

  return `evt_${buildStableHash([
    content.type,
    content.orderId || '',
    content.status || '',
    content.tag || '',
    content.body,
  ].join('|'))}`;
};

const buildNotificationHistoryId = (
  recipient: NotificationRecipient,
  content: PushMessageContent,
) => {
  const recipientSeed = recipient.userDocId || recipient.agentDocId || recipient.role;
  const normalizedRecipientSeed = recipientSeed.replace(/[^a-z0-9_-]/gi, '_').slice(0, 48) || 'recipient';
  return `notification_${normalizedRecipientSeed}_${resolveNotificationEventId(content)}`;
};

const writeNotificationHistoryEntry = async (
  adminDb: Firestore,
  recipient: NotificationRecipient,
  content: PushMessageContent,
) => {
  if (!recipient.userDocId) {
    return true;
  }

  const historyRef = adminDb
    .collection(NOTIFICATIONS_COLLECTION)
    .doc(buildNotificationHistoryId(recipient, content));
  try {
    await historyRef.create({
      body: content.body,
      createdAt: FieldValue.serverTimestamp(),
      eventId: resolveNotificationEventId(content),
      isRead: false,
      orderId: content.orderId || '',
      read: false,
      role: recipient.role,
      status: content.status || '',
      tag: content.tag || '',
      title: content.title,
      type: content.type,
      updatedAt: FieldValue.serverTimestamp(),
      url: normalizeUrl(content.url || '/'),
      userId: recipient.userDocId,
    });

    return true;
  } catch (error) {
    const errorCode = typeof error === 'object' && error && 'code' in error
      ? `${(error as { code?: unknown }).code || ''}`.trim().toLowerCase()
      : '';

    if (errorCode === '6' || errorCode === 'already-exists') {
      return false;
    }

    throw error;
  }
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
            channelId: getRoleChannelId(target.recipient.role),
            data: buildPushDataPayload(content, target.recipient.role),
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
          clearInvalidRecipientToken(adminDb, target, errorCode),
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

const sendFcmTargets = async (
  adminDb: Firestore,
  targets: NotificationTarget[],
  content: PushMessageContent,
) => {
  if (targets.length === 0) {
    return {
      attempted: 0,
      delivered: 0,
    };
  }

  const sendBatch = async (batchTargets: NotificationTarget[]) => {
    const response = await getAdminMessaging().sendEach(
      batchTargets.map(target => ({
        android: {
          collapseKey: content.tag || 'coffee-hub',
          priority: 'high',
          ttl: FCM_TTL_MS,
        },
        data: buildPushDataPayload(content, target.recipient.role),
        token: target.token,
        webpush: {
          fcmOptions: {
            link: normalizeUrl(content.url || '/'),
          },
          headers: {
            Urgency: content.urgency || 'high',
          },
          notification: {
            badge: '/icon-192.png',
            icon: '/icon-192.png',
            renotify: false,
            tag: content.tag || 'coffee-hub',
          },
        },
      })),
    );

    let delivered = 0;
    const retryableTargets: NotificationTarget[] = [];

    await Promise.all(response.responses.map(async (result, index) => {
      if (result.success) {
        delivered += 1;
        return;
      }

      const errorCode = result.error?.code || '';
      if (isInvalidFcmTokenErrorCode(errorCode)) {
        await clearInvalidRecipientToken(adminDb, batchTargets[index], errorCode);
        return;
      }

      retryableTargets.push(batchTargets[index]);
    }));

    return {
      delivered,
      retryableTargets,
    };
  };

  const firstAttempt = await sendBatch(targets);
  let delivered = firstAttempt.delivered;

  if (firstAttempt.retryableTargets.length > 0) {
    const retryAttempt = await sendBatch(firstAttempt.retryableTargets);
    delivered += retryAttempt.delivered;
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
  const uniqueRecipients = Array.from(
    recipients
      .filter(recipient =>
        shouldDeliverToRecipient(recipient, content.preferenceKey),
      )
      .reduce((accumulator, recipient) => {
        const key = recipient.userDocId || recipient.agentDocId || recipient.phone || `${recipient.role}-${accumulator.size}`;
        if (!accumulator.has(key)) {
          accumulator.set(key, recipient);
        }
        return accumulator;
      }, new Map<string, NotificationRecipient>())
      .values(),
  );
  const dispatchableRecipients = (
    await Promise.all(
      uniqueRecipients.map(async recipient => ({
        recipient,
        shouldSend: await writeNotificationHistoryEntry(adminDb, recipient, content),
      })),
    )
  )
    .filter(result => result.shouldSend)
    .map(result => result.recipient);
  const eligibleTargets = Array.from(
    dispatchableRecipients
      .flatMap(buildNotificationTargets)
      .reduce((accumulator, target) => {
        const key = `${target.tokenType}:${target.token}`;
        if (!accumulator.has(key)) {
          accumulator.set(key, target);
        }
        return accumulator;
      }, new Map<string, NotificationTarget>())
      .values(),
  );

  const fcmTargets = eligibleTargets.filter(target => target.tokenType === 'fcm');
  const expoTargets = eligibleTargets.filter(target => target.tokenType === 'expo');

  let delivered = 0;

  if (fcmTargets.length > 0) {
    const fcmResponse = await sendFcmTargets(adminDb, fcmTargets, content);
    delivered += fcmResponse.delivered;
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
    case 'WAITING':
      return {
        title: 'Coffee Hub \u2615',
        body: `Order placed successfully. We are confirming ${orderNumber} now.`,
        eventId: `customer_order_placed_${orderId}`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        type: 'customer_order_placed',
        url: buildOrderTrackingUrl(orderId),
      };
    case 'PREPARING':
      return {
        title: 'Coffee Hub \u2615',
        body: `Your order ${orderNumber} has been accepted and is being prepared`,
        eventId: `customer_order_preparing_${orderId}`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        type: 'customer_order_accepted',
        url: buildOrderTrackingUrl(orderId),
      };
    case 'OUT_FOR_DELIVERY':
      return {
        title: 'Coffee Hub \u2615',
        body: `Your order ${orderNumber} is on the way`,
        eventId: `customer_order_out_for_delivery_${orderId}`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        type: 'customer_out_for_delivery',
        url: buildOrderTrackingUrl(orderId),
      };
    case 'DELIVERED':
      return {
        title: 'Coffee Hub \u2615',
        body: `Your order ${orderNumber} was delivered successfully`,
        eventId: `customer_order_delivered_${orderId}`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        type: 'customer_order_delivered',
        url: buildOrderTrackingUrl(orderId),
      };
    case 'REJECTED':
      return {
        title: 'Coffee Hub \u2615',
        body: rejectionReason
          ? `Your order ${orderNumber} was rejected. Reason: ${rejectionReason}`
          : `Your order ${orderNumber} was rejected`,
        eventId: `customer_order_rejected_${orderId}`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        type: 'customer_order_rejected',
        url: buildOrderTrackingUrl(orderId),
      };
    case 'CANCELLED':
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} cancelled`,
        eventId: `customer_order_cancelled_${orderId}`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        type: 'customer_order_cancelled',
        url: buildOrderTrackingUrl(orderId),
      };
    default:
      return {
        title: 'Coffee Hub \u2615',
        body: `Order ${orderNumber} updated`,
        eventId: `customer_order_updated_${orderId}_${String(normalizedStatus).toLowerCase()}`,
        orderId,
        preferenceKey: 'orderUpdates',
        status: normalizedStatus,
        tag: `order-${orderId}`,
        type: 'customer_order_updated',
        url: buildOrderTrackingUrl(orderId),
      };
  }
};

export const buildAdminNewOrderNotification = (orderId: string): PushMessageContent => ({
  title: 'New Order Received',
  body: `A new order has been placed. Order #${orderId}`,
  eventId: `admin_new_order_${orderId}`,
  orderId,
  preferenceKey: 'orderUpdates',
  tag: `admin-order-${orderId}`,
  type: 'admin_new_order',
  url: '/?scope=admin',
});

export const buildAdminPaymentNotification = (orderId: string): PushMessageContent => ({
  title: 'Payment Received',
  body: `Payment completed for order #${orderId}`,
  eventId: `admin_payment_received_${orderId}`,
  orderId,
  preferenceKey: 'orderUpdates',
  tag: `admin-payment-${orderId}`,
  type: 'admin_payment_received',
  url: '/?scope=admin',
});

export const buildAdminOrderCancelledNotification = (orderId: string): PushMessageContent => ({
  title: 'Order Cancelled',
  body: `Order #${orderId} was cancelled by the customer.`,
  eventId: `admin_order_cancelled_${orderId}`,
  orderId,
  preferenceKey: 'orderUpdates',
  tag: `admin-order-cancelled-${orderId}`,
  type: 'admin_order_cancelled',
  url: '/?scope=admin',
});

export const buildAdminDeliveryAssignedNotification = (orderId: string): PushMessageContent => ({
  title: 'Delivery Assigned',
  body: `A delivery partner was assigned to order #${orderId}.`,
  eventId: `admin_delivery_assigned_${orderId}`,
  orderId,
  preferenceKey: 'orderUpdates',
  tag: `admin-delivery-assigned-${orderId}`,
  type: 'admin_delivery_assigned',
  url: '/?scope=admin',
});

export const buildAdminOrderCompletedNotification = (orderId: string): PushMessageContent => ({
  title: 'Order Completed',
  body: `Order #${orderId} was delivered successfully.`,
  eventId: `admin_order_completed_${orderId}`,
  orderId,
  preferenceKey: 'orderUpdates',
  tag: `admin-order-completed-${orderId}`,
  type: 'admin_order_completed',
  url: '/?scope=admin',
});

export const buildAgentAssignmentNotification = (orderId: string): PushMessageContent => ({
  title: 'New Order Assigned',
  body: `A new order was assigned to you. Order #${orderId}`,
  eventId: `agent_order_assigned_${orderId}`,
  orderId,
  preferenceKey: 'orderUpdates',
  tag: `agent-order-${orderId}`,
  type: 'agent_order_assigned',
  url: '/?scope=delivery',
});

export const buildAgentOrderCancelledNotification = (orderId: string): PushMessageContent => ({
  title: 'Delivery Cancelled',
  body: `Assigned order #${orderId} has been cancelled.`,
  eventId: `agent_order_cancelled_${orderId}`,
  orderId,
  preferenceKey: 'orderUpdates',
  tag: `agent-order-cancelled-${orderId}`,
  type: 'agent_order_cancelled',
  url: '/?scope=delivery',
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
        type: 'customer_order_updated',
        url: `${jobData.url || '/'}`.trim() || '/',
      });
    }

    await jobDoc.ref.delete();
    processed += 1;
  }

  return processed;
};
