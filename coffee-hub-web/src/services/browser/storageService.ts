export const readBrowserStorage = (key: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
};

export const writeBrowserStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
};

export const removeBrowserStorage = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
};
