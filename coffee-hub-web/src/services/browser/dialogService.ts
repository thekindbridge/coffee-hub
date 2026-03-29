export const confirmInBrowser = (message: string) => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.confirm(message);
};

export const alertInBrowser = (message: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.alert(message);
};
