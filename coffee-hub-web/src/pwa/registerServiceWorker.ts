export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker.register('/sw.js').catch(error => {
        console.error('Failed to register service worker', error);
      });
    },
    { once: true },
  );
};
