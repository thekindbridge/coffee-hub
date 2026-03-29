import {
  clearInstallPromptDismissal,
  dismissInstallPrompt,
  isInstallPromptDismissed,
  isStandaloneInstallMode,
  subscribeToInstallPromptEvents,
  type BeforeInstallPromptEvent,
} from '../browser/installPromptService';

export type InstallPromptEvent = BeforeInstallPromptEvent;

export interface InstallPromptAdapter {
  clearDismissal(): void;
  dismiss(): void;
  isDismissed(): boolean;
  isStandalone(): boolean;
  subscribe(params: {
    onAppInstalled: () => void;
    onBeforeInstallPrompt: (event: InstallPromptEvent) => void;
  }): () => void;
}

export const installPromptAdapter: InstallPromptAdapter = {
  clearDismissal: clearInstallPromptDismissal,
  dismiss: dismissInstallPrompt,
  isDismissed: isInstallPromptDismissed,
  isStandalone: isStandaloneInstallMode,
  subscribe: subscribeToInstallPromptEvents,
};
