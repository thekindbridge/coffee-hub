import type { NotificationRouteData } from './notificationTypes';

const COFFEE_HUB_APP_HOST = 'coffee-hub-inkollu.vercel.app';

const getTrimmedString = (value: unknown) =>
  typeof value === 'string'
    ? value.trim()
    : '';

const normalizeRole = (value: unknown): NotificationRouteData['role'] => {
  if (value === 'admin' || value === 'owner') {
    return 'admin';
  }

  if (value === 'delivery_agent' || value === 'agent') {
    return 'delivery_agent';
  }

  return 'customer';
};

export const normalizeAppNavigationUrl = (
  rawUrl: string,
  fallback = '/',
) => {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    return fallback;
  }

  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (
      parsedUrl.protocol === 'https:' &&
      parsedUrl.host === COFFEE_HUB_APP_HOST
    ) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || fallback;
    }
  } catch {
    return fallback;
  }

  return fallback;
};

export const resolveNotificationRouteData = ({
  body,
  data,
  link,
  title,
  url,
}: {
  body?: unknown;
  data?: Record<string, unknown> | null;
  link?: unknown;
  title?: unknown;
  url?: unknown;
}): NotificationRouteData => {
  const payload = data || {};
  const resolvedUrl = normalizeAppNavigationUrl(
    getTrimmedString(url) ||
      getTrimmedString(link) ||
      getTrimmedString(payload.url) ||
      '/',
  );

  return {
    body: getTrimmedString(body) || getTrimmedString(payload.body),
    eventId: getTrimmedString(payload.eventId),
    orderId: getTrimmedString(payload.orderId),
    role: normalizeRole(payload.recipientRole),
    status: getTrimmedString(payload.status),
    tag: getTrimmedString(payload.tag) || 'coffee-hub',
    title: getTrimmedString(title) || getTrimmedString(payload.title) || 'COFFEE-HUB',
    type: getTrimmedString(payload.type) || 'notification',
    url: resolvedUrl,
  };
};

export const buildForegroundNotificationFromRoute = (
  routeData: NotificationRouteData,
) => ({
  body: routeData.body,
  eventId: routeData.eventId,
  id: routeData.eventId || `${Date.now()}`,
  role: routeData.role,
  tag: routeData.tag,
  title: routeData.title,
  type: routeData.type,
  url: routeData.url,
});

export const buildNotificationDeduplicationKey = (
  routeData: NotificationRouteData,
) => routeData.eventId || [
  routeData.role,
  routeData.type,
  routeData.tag,
  routeData.url,
  routeData.body,
].join('|');
