import { useEffect, useState } from 'react';
import {
  installPromptAdapter,
  type InstallPromptEvent,
} from '../../../services/platform/installPromptAdapter';

export const useInstallPrompt = () => {
  // Web-only: React Native should replace this with a native store/install entry point.
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsInstalled(installPromptAdapter.isStandalone());
    setIsDismissed(installPromptAdapter.isDismissed());

    return installPromptAdapter.subscribe({
      onBeforeInstallPrompt: installEvent => {
        if (installPromptAdapter.isStandalone() || installPromptAdapter.isDismissed()) {
          return;
        }

        setDeferredPrompt(installEvent);
      },
      onAppInstalled: () => {
        setIsInstalled(true);
        setIsDismissed(false);
        setDeferredPrompt(null);
        installPromptAdapter.clearDismissal();
      },
    });
  }, []);

  const dismissPrompt = () => {
    installPromptAdapter.dismiss();
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
      installPromptAdapter.clearDismissal();
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
