const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const sanitizeFirestoreValue = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeFirestoreValue(item))
      .filter(item => item !== undefined);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((accumulator, [key, entryValue]) => {
      const sanitizedValue = sanitizeFirestoreValue(entryValue);

      if (sanitizedValue !== undefined) {
        accumulator[key] = sanitizedValue;
      }

      return accumulator;
    }, {});
  }

  return value;
};

export const sanitizeFirestoreData = <T>(data: T): T => (
  sanitizeFirestoreValue(data) as T
);
