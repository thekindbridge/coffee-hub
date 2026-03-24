import { Bell, BellOff, Megaphone, PackageCheck } from 'lucide-react';
import type { NotificationSettings } from '../features/app/types';

export type PushPermissionState =
  | NotificationPermission
  | 'unsupported';

type NotificationSettingsPanelProps = {
  settings: NotificationSettings;
  permissionState: PushPermissionState;
  isSyncing: boolean;
  syncError: string;
  onSettingsChange: (settings: NotificationSettings) => void;
  onEnablePush: () => void;
};

const ToggleRow = ({
  label,
  description,
  checked,
  onToggle,
  Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  Icon: typeof PackageCheck;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8"
  >
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-secondary">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-accent">{label}</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
      </div>
    </div>
    <div
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        checked ? 'bg-primary' : 'bg-white/10'
      }`}
      aria-hidden="true"
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </div>
  </button>
);

const getPermissionLabel = (permissionState: PushPermissionState) => {
  if (permissionState === 'granted') {
    return 'Push notifications enabled';
  }

  if (permissionState === 'denied') {
    return 'Blocked in browser settings';
  }

  if (permissionState === 'unsupported') {
    return 'Not supported on this device';
  }

  return 'Not enabled yet';
};

export const NotificationSettingsPanel = ({
  settings,
  permissionState,
  isSyncing,
  syncError,
  onSettingsChange,
  onEnablePush,
}: NotificationSettingsPanelProps) => {
  const canPromptForPush = permissionState === 'default';

  return (
    <div className="coffee-surface-soft rounded-[26px] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
        Notification Settings
      </p>
      <p className="mt-1 text-xs leading-5 text-ink-muted">
        Keep important order updates on, and enable offers only if you want promotions.
      </p>

      <div className="mt-4 space-y-3">
        <ToggleRow
          checked={settings.orderUpdates}
          description="Delivery progress, order acceptance, delays, and completion alerts."
          Icon={PackageCheck}
          label="Order Updates"
          onToggle={() => onSettingsChange({
            ...settings,
            orderUpdates: !settings.orderUpdates,
          })}
        />
        <ToggleRow
          checked={settings.offers}
          description="Occasional discounts and new-offer alerts. Off by default."
          Icon={Megaphone}
          label="Offers & Promotions"
          onToggle={() => onSettingsChange({
            ...settings,
            offers: !settings.offers,
          })}
        />
      </div>

      <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-accent">
          {permissionState === 'granted' ? (
            <Bell size={16} className="text-secondary" />
          ) : (
            <BellOff size={16} className="text-secondary" />
          )}
          <span className="text-sm font-semibold">{getPermissionLabel(permissionState)}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          {permissionState === 'granted'
            ? 'This device can receive real-time push alerts even when the app is in the background.'
            : permissionState === 'denied'
              ? 'Turn notifications back on in your browser settings if you want live order alerts again.'
              : permissionState === 'unsupported'
                ? 'This browser does not support web push, so only in-app updates will be available.'
                : 'Enable push to receive important updates outside the app.'}
        </p>

        {canPromptForPush && (
          <button
            type="button"
            onClick={onEnablePush}
            disabled={isSyncing}
            className="coffee-btn-primary mt-4 w-full justify-center disabled:opacity-70"
          >
            {isSyncing ? 'Enabling notifications...' : 'Enable Push Notifications'}
          </button>
        )}
      </div>

      {syncError && (
        <div className="mt-3 rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
          {syncError}
        </div>
      )}
    </div>
  );
};
