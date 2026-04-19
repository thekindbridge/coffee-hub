import { Clock3 } from 'lucide-react';
import { ADMIN_EMAIL } from '../../app/lib/constants';
import type { AccessEntry, ShopTimingDraft } from '../../app/types';
import { formatShopTimingRange, type ShopTiming } from '../../../../shared/shopTiming';

type StaffProfileAdminControlsProps = {
  isAdmin: boolean;
  isMainAdmin: boolean;
  shopTiming: ShopTiming;
  shopTimingDraft: ShopTimingDraft;
  shopTimingError: string;
  shopTimingSuccess: string;
  isShopTimingSaving: boolean;
  adminAccessEntries: AccessEntry[];
  deliveryAccessEntries: AccessEntry[];
  adminAccessInput: string;
  deliveryAccessInput: string;
  adminAccessError: string;
  deliveryAccessError: string;
  adminAccessSuccess: string;
  deliveryAccessSuccess: string;
  isAdminAccessSaving: boolean;
  isDeliveryAccessSaving: boolean;
  adminAccessRemovingId: string;
  deliveryAccessRemovingId: string;
  onShopTimingDraftChange: (draft: ShopTimingDraft) => void;
  onSaveShopTiming: () => void;
  onAdminAccessInputChange: (value: string) => void;
  onDeliveryAccessInputChange: (value: string) => void;
  onAddAdminAccess: () => void;
  onRemoveAdminAccess: (entry: AccessEntry) => void;
  onAddDeliveryAccess: () => void;
  onRemoveDeliveryAccess: (entry: AccessEntry) => void;
};

export const StaffProfileAdminControls = ({
  isAdmin,
  isMainAdmin,
  shopTiming,
  shopTimingDraft,
  shopTimingError,
  shopTimingSuccess,
  isShopTimingSaving,
  adminAccessEntries,
  deliveryAccessEntries,
  adminAccessInput,
  deliveryAccessInput,
  adminAccessError,
  deliveryAccessError,
  adminAccessSuccess,
  deliveryAccessSuccess,
  isAdminAccessSaving,
  isDeliveryAccessSaving,
  adminAccessRemovingId,
  deliveryAccessRemovingId,
  onShopTimingDraftChange,
  onSaveShopTiming,
  onAdminAccessInputChange,
  onDeliveryAccessInputChange,
  onAddAdminAccess,
  onRemoveAdminAccess,
  onAddDeliveryAccess,
  onRemoveDeliveryAccess,
}: StaffProfileAdminControlsProps) => {
  if (!isAdmin) {
    return null;
  }

  const currentShopTimingLabel = formatShopTimingRange(shopTiming.openTime, shopTiming.closeTime);

  return (
    <>
      <div className="coffee-surface-soft rounded-[26px] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
          Shop Timing
        </p>
        <h3 className="mt-1 text-lg font-semibold text-accent">Ordering Window</h3>
        <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-ink-muted">
          <div className="flex items-center gap-2 font-semibold text-accent">
            <Clock3 size={15} className="text-secondary" />
            Current timing: {currentShopTimingLabel}
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            Use HH:MM values in 24-hour format. Orders are accepted from the opening time until the closing time starts.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              Open Time
            </label>
            <input
              type="time"
              step={60}
              className="coffee-input"
              value={shopTimingDraft.openTime}
              onChange={event => onShopTimingDraftChange({
                ...shopTimingDraft,
                openTime: event.target.value,
              })}
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              Close Time
            </label>
            <input
              type="time"
              step={60}
              className="coffee-input"
              value={shopTimingDraft.closeTime}
              onChange={event => onShopTimingDraftChange({
                ...shopTimingDraft,
                closeTime: event.target.value,
              })}
            />
          </div>
        </div>
        {shopTimingError && (
          <div className="mt-3 rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            {shopTimingError}
          </div>
        )}
        {shopTimingSuccess && (
          <div className="mt-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            {shopTimingSuccess}
          </div>
        )}
        <button
          onClick={onSaveShopTiming}
          disabled={isShopTimingSaving}
          className="coffee-btn-primary mt-4 w-full justify-center disabled:opacity-70"
        >
          {isShopTimingSaving ? 'Saving timing...' : 'Save Timing'}
        </button>
      </div>

      <div className="coffee-surface-soft rounded-[26px] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
          Management
        </p>
        <h3 className="mt-1 text-lg font-semibold text-accent">Admin Management</h3>
        <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-ink-muted">
          {isMainAdmin
            ? 'You can add or remove admin and delivery agent access.'
            : 'View only. Only the main admin can update access.'}
        </div>
        <div className="mt-4 space-y-2">
          {adminAccessEntries.length === 0 ? (
            <p className="text-sm text-ink-muted">No admins added yet.</p>
          ) : (
            adminAccessEntries.map(entry => {
              const isProtected = entry.email === ADMIN_EMAIL;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="break-all text-sm font-semibold text-accent">
                    {entry.email}
                  </span>
                  {isMainAdmin ? (
                    <button
                      onClick={() => onRemoveAdminAccess(entry)}
                      disabled={isProtected || adminAccessRemovingId === entry.id}
                      className="rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProtected
                        ? 'Main'
                        : adminAccessRemovingId === entry.id
                          ? 'Removing'
                          : 'Remove'}
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                      View only
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
        {adminAccessError && (
          <div className="mt-3 rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            {adminAccessError}
          </div>
        )}
        {adminAccessSuccess && (
          <div className="mt-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            {adminAccessSuccess}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <input
            type="email"
            className="coffee-input"
            placeholder="Add Admin Email"
            value={adminAccessInput}
            onChange={event => onAdminAccessInputChange(event.target.value)}
            disabled={!isMainAdmin || isAdminAccessSaving}
          />
          <button
            onClick={onAddAdminAccess}
            disabled={!isMainAdmin || isAdminAccessSaving}
            className="coffee-btn-primary w-full justify-center disabled:opacity-60"
          >
            {isAdminAccessSaving ? 'Adding...' : 'Add Admin'}
          </button>
        </div>
      </div>

      <div className="coffee-surface-soft rounded-[26px] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
          Delivery Agents
        </p>
        <h3 className="mt-1 text-lg font-semibold text-accent">
          Delivery Agent Management
        </h3>
        <div className="mt-4 space-y-2">
          {deliveryAccessEntries.length === 0 ? (
            <p className="text-sm text-ink-muted">No delivery agents added yet.</p>
          ) : (
            deliveryAccessEntries.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className="break-all text-sm font-semibold text-accent">
                  {entry.email}
                </span>
                {isMainAdmin ? (
                  <button
                    onClick={() => onRemoveDeliveryAccess(entry)}
                    disabled={deliveryAccessRemovingId === entry.id}
                    className="rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deliveryAccessRemovingId === entry.id ? 'Removing' : 'Remove'}
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                    View only
                  </span>
                )}
              </div>
            ))
          )}
        </div>
        {deliveryAccessError && (
          <div className="mt-3 rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            {deliveryAccessError}
          </div>
        )}
        {deliveryAccessSuccess && (
          <div className="mt-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            {deliveryAccessSuccess}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <input
            type="email"
            className="coffee-input"
            placeholder="Add Delivery Agent"
            value={deliveryAccessInput}
            onChange={event => onDeliveryAccessInputChange(event.target.value)}
            disabled={!isMainAdmin || isDeliveryAccessSaving}
          />
          <button
            onClick={onAddDeliveryAccess}
            disabled={!isMainAdmin || isDeliveryAccessSaving}
            className="coffee-btn-primary w-full justify-center disabled:opacity-60"
          >
            {isDeliveryAccessSaving ? 'Adding...' : 'Add Delivery Agent'}
          </button>
        </div>
      </div>
    </>
  );
};
