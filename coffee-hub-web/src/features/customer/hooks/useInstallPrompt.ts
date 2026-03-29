import { useEffect, useState } from 'react';
import {
  clearInstallPromptDismissal,
  dismissInstallPrompt,
  isInstallPromptDismissed,
  isStandaloneInstallMode,
  subscribeToInstallPromptEvents,
  type BeforeInstallPromptEvent,
} from '../../../services/browser/installPromptService';

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneInstallMode());
    setIsDismissed(isInstallPromptDismissed());

    return subscribeToInstallPromptEvents({
      onBeforeInstallPrompt: installEvent => {
        if (isStandaloneInstallMode() || isInstallPromptDismissed()) {
          return;
        }

        setDeferredPrompt(installEvent);
      },
      onAppInstalled: () => {
        setIsInstalled(true);
        setIsDismissed(false);
        setDeferredPrompt(null);
        clearInstallPromptDismissal();
      },
    });
  }, []);

  const dismissPrompt = () => {
    dismissInstallPrompt();
    setIsDismissed(true);
  };

  const promptToInstall = async () => {
    if (!deferredPrompt) {
      return false;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      clearInstallPromptDismissal();
      return true;
    }

    return false;
  };

  return {
    dismissPrompt,
    isInstallPromptAvailable: Boolean(deferredPrompt) && !isInstalled && !isDismissed,
    promptToInstall,
  };
};
