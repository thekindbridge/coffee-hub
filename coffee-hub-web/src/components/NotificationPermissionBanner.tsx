import { BellRing, X } from 'lucide-react';

type NotificationPermissionBannerProps = {
  isSyncing: boolean;
  onEnable: () => void;
  onDismiss: () => void;
};

export const NotificationPermissionBanner = ({
  isSyncing,
  onEnable,
  onDismiss,
}: NotificationPermissionBannerProps) => (
  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(111,78,55,0.42),rgba(33,24,20,0.94))] p-4 text-[#fff8f2] shadow-[0_18px_40px_rgba(25,14,10,0.28)]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#f6c18b]">
          <BellRing size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f6c18b]">
            Stay Updated
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            Turn on push notifications for live order updates.
          </p>
          <p className="mt-1 text-xs leading-5 text-[#ead8cc]">
            We only send important order progress and the offers you opt into.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full border border-white/10 bg-white/5 p-2 text-[#ead8cc] transition hover:bg-white/10"
        aria-label="Dismiss notification prompt"
      >
        <X size={14} />
      </button>
    </div>

    <div className="mt-4 flex gap-3">
      <button
        type="button"
        onClick={onEnable}
        disabled={isSyncing}
        className="coffee-btn-primary flex-1 justify-center disabled:opacity-70"
      >
        {isSyncing ? 'Enabling...' : 'Enable Notifications'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="coffee-btn-secondary flex-1 justify-center"
      >
        Not Now
      </button>
    </div>
  </div>
);
