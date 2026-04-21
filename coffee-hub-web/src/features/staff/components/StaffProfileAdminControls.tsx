import { Clock3 } from 'lucide-react';
import { formatPhoneForDisplay } from '../../../../shared/phone';
import { ADMIN_PHONE } from '../../app/lib/constants';
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
  userRoleEntries: AccessEntry[];
  roleChangeError: string;
  roleChangeSuccess: string;
  updatingUserRoleId: string;
  updatingUserRoleValue: AccessEntry['role'] | '';
  onShopTimingDraftChange: (draft: ShopTimingDraft) => void;
  onSaveShopTiming: () => void;
  onChangeUserRole: (
    entry: AccessEntry,
    role: AccessEntry['role'],
  ) => void;
};

const ROLE_LABEL: Record<AccessEntry['role'], string> = {
  admin: 'Admin',
  agent: 'Agent',
  customer: 'Customer',
};

const ROLE_BUTTONS: AccessEntry['role'][] = ['admin', 'agent', 'customer'];

export const StaffProfileAdminControls = ({
  isAdmin,
  isMainAdmin,
  shopTiming,
  shopTimingDraft,
  shopTimingError,
  shopTimingSuccess,
  isShopTimingSaving,
  userRoleEntries,
  roleChangeError,
  roleChangeSuccess,
  updatingUserRoleId,
  updatingUserRoleValue,
  onShopTimingDraftChange,
  onSaveShopTiming,
  onChangeUserRole,
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
        <h3 className="mt-1 text-lg font-semibold text-accent">User Role Management</h3>
        <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-ink-muted">
          {isMainAdmin
            ? 'Roles update directly in users/{uid}.role and sync to active sessions in real time.'
            : 'Admins can update roles here. The configured main admin phone remains locked.'}
        </div>

        <div className="mt-4 space-y-3">
          {userRoleEntries.length === 0 ? (
            <p className="text-sm text-ink-muted">No signed-in users are available yet.</p>
          ) : (
            userRoleEntries.map(entry => {
              const isLocked = Boolean(ADMIN_PHONE && entry.phone === ADMIN_PHONE);
              const isUpdating = updatingUserRoleId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="rounded-[22px] border border-white/10 bg-white/5 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-semibold text-accent">
                        {formatPhoneForDisplay(entry.phone)}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                        {isLocked ? 'Main admin account' : 'Firestore user'}
                      </p>
                    </div>
                    <span className="rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">
                      {ROLE_LABEL[entry.role]}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {ROLE_BUTTONS.map(roleOption => {
                      const isActiveRole = entry.role === roleOption;
                      const isDisabled = isLocked || isUpdating || isActiveRole;

                      return (
                        <button
                          key={`${entry.id}-${roleOption}`}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => onChangeUserRole(entry, roleOption)}
                          className={`rounded-[14px] border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                            isActiveRole
                              ? 'border-secondary/35 bg-secondary/10 text-secondary'
                              : 'border-white/10 bg-white/5 text-ink-muted hover:bg-white/8 hover:text-accent'
                          } disabled:cursor-not-allowed disabled:opacity-55`}
                        >
                          {isUpdating && updatingUserRoleValue === roleOption
                            ? 'Saving'
                            : ROLE_LABEL[roleOption]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {roleChangeError && (
          <div className="mt-3 rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            {roleChangeError}
          </div>
        )}
        {roleChangeSuccess && (
          <div className="mt-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            {roleChangeSuccess}
          </div>
        )}
      </div>
    </>
  );
};
