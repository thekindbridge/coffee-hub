export type ShopTiming = {
  openTime: number;
  closeTime: number;
  updatedAt?: string;
};

export const SHOP_TIMEZONE = 'Asia/Kolkata';

export const DEFAULT_SHOP_TIMING: ShopTiming = {
  openTime: 6,
  closeTime: 22,
};

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

const shopHourFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  hour12: false,
  hourCycle: 'h23',
  timeZone: SHOP_TIMEZONE,
});

const isValidHour = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 23;

const normalizeHour = (value: unknown, fallback: number) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return isValidHour(numericValue) ? numericValue : fallback;
};

export const validateShopTiming = (openTime: number, closeTime: number) => {
  if (!isValidHour(openTime) || !isValidHour(closeTime)) {
    return 'Open time and close time must be whole hours between 0 and 23.';
  }

  if (openTime >= closeTime) {
    return 'Open time must be earlier than close time.';
  }

  return '';
};

export const sanitizeShopTiming = (value?: {
  openTime?: unknown;
  closeTime?: unknown;
  updatedAt?: unknown;
}): ShopTiming => {
  const openTime = normalizeHour(value?.openTime, DEFAULT_SHOP_TIMING.openTime);
  const closeTime = normalizeHour(value?.closeTime, DEFAULT_SHOP_TIMING.closeTime);

  if (validateShopTiming(openTime, closeTime)) {
    return { ...DEFAULT_SHOP_TIMING };
  }

  return {
    openTime,
    closeTime,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : undefined,
  };
};

export const formatShopHour = (hour: number) => {
  const normalizedHour = normalizeHour(hour, 0);
  return timeFormatter.format(new Date(Date.UTC(2024, 0, 1, normalizedHour, 0, 0)));
};

export const formatShopTimingRange = (openTime: number, closeTime: number) => {
  const normalizedTiming = sanitizeShopTiming({ openTime, closeTime });
  return `${formatShopHour(normalizedTiming.openTime)} - ${formatShopHour(normalizedTiming.closeTime)}`;
};

export const buildShopClosedMessage = (openTime: number, closeTime: number) =>
  `Our shop is currently closed. Please place your order between ${formatShopTimingRange(openTime, closeTime)}.`;

export const buildShopClosedBannerMessage = (openTime: number) =>
  `Dear Customer, our shop is currently closed. We will reopen at ${formatShopHour(openTime)}. Thank you for your patience.`;

export const buildCheckoutClosedMessage = (openTime: number) =>
  `Shop is currently closed. Orders will be accepted after ${formatShopHour(openTime)}.`;

export const buildShopAvailabilityMessage = (openTime: number) =>
  `Available after ${formatShopHour(openTime)}`;

export const getCurrentShopHour = (currentDate: Date = new Date()) => {
  const hourPart = shopHourFormatter
    .formatToParts(currentDate)
    .find(part => part.type === 'hour')
    ?.value;
  const hour = Number(hourPart);

  return Number.isInteger(hour) ? hour : currentDate.getUTCHours();
};

export const isShopOpenAtHour = (currentHour: number, openTime: number, closeTime: number) => {
  if (!Number.isInteger(currentHour) || currentHour < 0 || currentHour > 23) {
    return false;
  }

  const normalizedTiming = sanitizeShopTiming({ openTime, closeTime });
  return currentHour >= normalizedTiming.openTime && currentHour < normalizedTiming.closeTime;
};

export const isShopOpen = (
  openTime: number,
  closeTime: number,
  currentDate: Date = new Date(),
) => isShopOpenAtHour(getCurrentShopHour(currentDate), openTime, closeTime);
