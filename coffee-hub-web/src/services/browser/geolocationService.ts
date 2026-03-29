import type { CheckoutCustomerDetails } from '../../types';

export const getCurrentBrowserLocation = () =>
  new Promise<CheckoutCustomerDetails['location']>((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? Number(position.coords.accuracy.toFixed(1))
            : undefined,
        });
      },
      error => {
        reject(new Error(error.message || 'Unable to access your location.'));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
