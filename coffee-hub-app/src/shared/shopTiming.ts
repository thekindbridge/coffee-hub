export type ShopTiming = {
  openTime: string;
  closeTime: string;
  updatedAt?: string;
};

export const SHOP_TIMEZONE = 'Asia/Kolkata';

export const EMPTY_SHOP_TIMING: ShopTiming = {
  openTime: '',
  closeTime: '',
};

const DAY_MINUTES = 24 * 60;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

const displayFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

const currentTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
  timeZone: SHOP_TIMEZONE,
});

const padTimePart = (value: number) => String(value).padStart(2, '0');

const normalizeTimeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  const match = value.trim().match(TIME_PATTERN);
  if (!match) {
    return '';
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return '';
  }

  return `${padTimePart(hours)}:${padTimePart(minutes)}`;
};

export const parseTimeToMinutes = (value: string) => {
  const normalizedValue = normalizeTimeString(value);
  const match = normalizedValue.match(TIME_PATTERN);

  if (!match) {
    return Number.NaN;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return (hours * 60) + minutes;
};

export const isValidTimeString = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(parseTimeToMinutes(value));

export const validateShopTiming = (openTime: string, closeTime: string) => {
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes)) {
    return 'Open time and close time must use HH:MM format.';
  }

  if (openMinutes >= closeMinutes) {
    return 'Open time must be earlier than close time.';
  }

  return '';
};

export const sanitizeShopTiming = (value?: {
  openTime?: unknown;
  closeTime?: unknown;
  updatedAt?: unknown;
}): ShopTiming | null => {
  const openTime = normalizeTimeString(value?.openTime);
  const closeTime = normalizeTimeString(value?.closeTime);

  if (validateShopTiming(openTime, closeTime)) {
    return null;
  }

  return {
    openTime,
    closeTime,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : undefined,
  };
};

export const getCurrentTimeInMinutes = (currentDate: Date = new Date()) => {
  const parts = currentTimeFormatter.formatToParts(currentDate);
  const hour = Number(parts.find(part => part.type === 'hour')?.value);
  const minute = Number(parts.find(part => part.type === 'minute')?.value);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return (currentDate.getHours() * 60) + currentDate.getMinutes();
  }

  return (hour * 60) + minute;
};

export const isShopOpen = (
  openTime: string,
  closeTime: string,
  currentTimeInMinutes: number = getCurrentTimeInMinutes(),
) => {
  const validationMessage = validateShopTiming(openTime, closeTime);
  if (validationMessage) {
    return false;
  }

  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (
    !Number.isFinite(currentTimeInMinutes) ||
    currentTimeInMinutes < 0 ||
    currentTimeInMinutes >= DAY_MINUTES
  ) {
    return false;
  }

  return currentTimeInMinutes >= openMinutes && currentTimeInMinutes < closeMinutes;
};

export const formatShopTime = (value: string) => {
  const totalMinutes = parseTimeToMinutes(value);
  if (!Number.isFinite(totalMinutes)) {
    return '--';
  }

  const safeMinutes = totalMinutes;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return displayFormatter.format(new Date(Date.UTC(2024, 0, 1, hours, minutes, 0)));
};

export const formatShopTimingRange = (openTime: string, closeTime: string) => {
  return validateShopTiming(openTime, closeTime)
    ? 'Shop timing unavailable'
    : `${formatShopTime(openTime)} - ${formatShopTime(closeTime)}`;
};

export const getMinutesUntilOpen = (
  openTime: string,
  currentTimeInMinutes: number = getCurrentTimeInMinutes(),
) => {
  const normalizedOpenTime = normalizeTimeString(openTime);
  const openMinutes = parseTimeToMinutes(normalizedOpenTime);

  if (!Number.isFinite(openMinutes)) {
    return 0;
  }

  if (!Number.isFinite(currentTimeInMinutes) || currentTimeInMinutes < 0 || currentTimeInMinutes >= DAY_MINUTES) {
    return openMinutes;
  }

  return currentTimeInMinutes <= openMinutes
    ? openMinutes - currentTimeInMinutes
    : (DAY_MINUTES - currentTimeInMinutes) + openMinutes;
};

export const formatCountdown = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

export const buildOpensInMessage = (
  openTime: string,
  currentTimeInMinutes: number = getCurrentTimeInMinutes(),
) => Number.isFinite(parseTimeToMinutes(openTime))
  ? `Opens in ${formatCountdown(getMinutesUntilOpen(openTime, currentTimeInMinutes))}`
  : '';

export const buildMenuClosedMessage = (openTime: string) =>
  Number.isFinite(parseTimeToMinutes(openTime))
    ? `Closed \u2022 Opens at ${formatShopTime(openTime)}`
    : 'Closed \u2022 Checking shop timing';

export const buildCheckoutClosedMessage = (openTime: string) =>
  Number.isFinite(parseTimeToMinutes(openTime))
    ? `Shop is currently closed. Opens at ${formatShopTime(openTime)}.`
    : 'Shop timing is unavailable right now. Please try again shortly.';

export const buildShopClosedBannerMessage = (
  openTime: string,
  closeTime: string,
) => validateShopTiming(openTime, closeTime)
  ? 'Shop is closed right now.'
  : `Shop is closed. Orders available from ${formatShopTime(openTime)} to ${formatShopTime(closeTime)}.`;

export const buildShopAvailabilityMessage = (openTime: string) =>
  Number.isFinite(parseTimeToMinutes(openTime))
    ? `Orders available after ${formatShopTime(openTime)}.`
    : 'Checking shop timing...';
