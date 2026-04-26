import { useEffect, useState } from 'react';
import { isNetworkUnavailable } from '../../../services/platform/networkStatusService';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => !isNetworkUnavailable());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncNetworkState = () => {
      setIsOnline(!isNetworkUnavailable());
    };

    window.addEventListener('online', syncNetworkState);
    window.addEventListener('offline', syncNetworkState);
    syncNetworkState();

    return () => {
      window.removeEventListener('online', syncNetworkState);
      window.removeEventListener('offline', syncNetworkState);
    };
  }, []);

  return {
    isOffline: !isOnline,
    isOnline,
  };
};
