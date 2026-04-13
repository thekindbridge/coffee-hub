const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatDateTime = (value?: string | null, fallback = 'Unknown') => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.toLocaleString() : fallback;
};

export const formatShortDate = (value?: string | null, fallback = 'Unknown') => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.toLocaleDateString() : fallback;
};

export const formatShortTime = (value?: string | null, fallback = '--') => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.toLocaleTimeString() : fallback;
};
