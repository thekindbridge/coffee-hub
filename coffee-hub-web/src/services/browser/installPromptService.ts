import { storageAdapter } from '../platform/storageAdapter';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

const DISMISS_STORAGE_KEY = 'coffee-hub-install-dismissed';

export const isStandaloneInstallMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
};

export const isInstallPromptDismissed = () =>
  storageAdapter.read(DISMISS_STORAGE_KEY) === '1';

export const dismissInstallPrompt = () => {
  storageAdapter.write(DISMISS_STORAGE_KEY, '1');
};

export const clearInstallPromptDismissal = () => {
  storageAdapter.remove(DISMISS_STORAGE_KEY);
};

export const subscribeToInstallPromptEvents = ({
  onAppInstalled,
  onBeforeInstallPrompt,
}: {
  onBeforeInstallPrompt: (event: BeforeInstallPromptEvent) => void;
  onAppInstalled: () => void;
}) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleBeforeInstallPrompt = (event: Event) => {
    const installEvent = event as BeforeInstallPromptEvent;
    installEvent.preventDefault();
    onBeforeInstallPrompt(installEvent);
  };

  window.addEventListener(
    'beforeinstallprompt',
    handleBeforeInstallPrompt as EventListener,
  );
  window.addEventListener('appinstalled', onAppInstalled);

  return () => {
    window.removeEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener,
    );
    window.removeEventListener('appinstalled', onAppInstalled);
  };
};
