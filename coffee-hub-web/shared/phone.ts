const NON_DIGIT_PATTERN = /\D+/g;
const INDIA_COUNTRY_CODE = '91';

const toDigits = (value: string) => value.replace(NON_DIGIT_PATTERN, '');

export const normalizePhoneNumber = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  if (trimmedValue.startsWith('+')) {
    const digits = toDigits(trimmedValue.slice(1));
    if (digits.length < 10) {
      throw new Error('Enter a valid mobile number.');
    }

    return `+${digits}`;
  }

  const digits = toDigits(trimmedValue);
  if (digits.length === 10) {
    return `+${INDIA_COUNTRY_CODE}${digits}`;
  }

  if (digits.length === 12 && digits.startsWith(INDIA_COUNTRY_CODE)) {
    return `+${digits}`;
  }

  throw new Error('Enter a valid mobile number.');
};

export const safeNormalizePhoneNumber = (value: string) => {
  try {
    return normalizePhoneNumber(value);
  } catch {
    return '';
  }
};

export const stripPhoneCountryCode = (value: string) => {
  const normalizedPhone = safeNormalizePhoneNumber(value);
  if (!normalizedPhone) {
    return toDigits(value.trim());
  }

  if (normalizedPhone.startsWith(`+${INDIA_COUNTRY_CODE}`)) {
    return normalizedPhone.slice(INDIA_COUNTRY_CODE.length + 1);
  }

  return normalizedPhone.replace(/^\+/, '');
};

export const formatPhoneForDisplay = (value: string) => {
  const normalizedPhone = safeNormalizePhoneNumber(value);
  if (!normalizedPhone) {
    return value.trim();
  }

  if (normalizedPhone.startsWith(`+${INDIA_COUNTRY_CODE}`)) {
    return `+${INDIA_COUNTRY_CODE} ${normalizedPhone.slice(INDIA_COUNTRY_CODE.length + 1)}`;
  }

  return normalizedPhone;
};

export const isValidPhoneNumber = (value: string) =>
  Boolean(safeNormalizePhoneNumber(value));
