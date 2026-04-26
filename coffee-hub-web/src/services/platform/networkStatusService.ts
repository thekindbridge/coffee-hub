export const isNetworkUnavailable = () => (
  typeof navigator !== 'undefined' && navigator.onLine === false
);

export const getNetworkErrorMessage = () => 'Check your internet connection';
