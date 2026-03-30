import type { DeliveryLocation } from '../types';

const toFiniteNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const isCoordinateInRange = (value: number, minimum: number, maximum: number) =>
  value >= minimum && value <= maximum;

export const normalizeDeliveryLocation = (value: unknown): DeliveryLocation | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const lat = toFiniteNumber(data.lat);
  const lng = toFiniteNumber(data.lng);
  const accuracy = toFiniteNumber(data.accuracy);

  if (
    lat === null ||
    lng === null ||
    !isCoordinateInRange(lat, -90, 90) ||
    !isCoordinateInRange(lng, -180, 180) ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  return {
    lat,
    lng,
    accuracy: accuracy ?? undefined,
  };
};
