type InstallAppBannerProps = {
  isVisible: boolean;
  isCartButtonVisible: boolean;
  onDismiss: () => void;
  onInstall: () => void;
};

export const InstallAppBanner = ({
  isVisible,
  isCartButtonVisible,
  onDismiss,
  onInstall,
}: InstallAppBannerProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed left-4 right-4 z-30 mx-auto max-w-screen-md rounded-[24px] border border-white/10 bg-[#18110d]/92 px-4 py-4 shadow-[0_20px_44px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:left-6 sm:right-6 ${isCartButtonVisible ? 'bottom-[10.5rem]' : 'bottom-24'}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="pr-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">Install app</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Add COFFEE-HUB to your home screen for quicker reorders and a cleaner full-screen experience.
          </p>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-ink-muted transition hover:border-white/18 hover:text-accent"
          >
            Not now
          </button>
          <button type="button" onClick={onInstall} className="coffee-btn-primary min-h-10 px-4">
            Install
          </button>
        </div>
      </div>
    </div>
  );
};
