import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { formatPhoneForDisplay } from '../../../../shared/phone';
import type { AccessEntry, ManagedUserRole, ShopTimingDraft } from '../../app/types';
import { formatShopTimingRange, type ShopTiming } from '../../../../shared/shopTiming';

type StaffProfileAdminControlsProps = {
  canAccessAdminPanel: boolean;
  isOwner: boolean;
  shopTiming: ShopTiming;
  shopTimingDraft: ShopTimingDraft;
  shopTimingError: string;
  shopTimingSuccess: string;
  isShopTimingSaving: boolean;
  userRoleEntries: AccessEntry[];
  roleChangeError: string;
  roleChangeSuccess: string;
  pendingRoleAction: 'assign' | 'remove' | '';
  pendingRolePhone: string;
  pendingRoleValue: ManagedUserRole | '';
  onShopTimingDraftChange: (draft: ShopTimingDraft) => void;
  onSaveShopTiming: () => void;
  onAssignUserRole: (phone: string, role: ManagedUserRole) => void;
  onRemoveUserRole: (entry: AccessEntry) => void;
};

const ROLE_LABEL: Record<ManagedUserRole, string> = {
  admin: 'Admin',
  delivery_agent: 'Delivery Agent',
};

export const StaffProfileAdminControls = ({
  canAccessAdminPanel,
  isOwner,
  shopTiming,
  shopTimingDraft,
  shopTimingError,
  shopTimingSuccess,
  isShopTimingSaving,
  userRoleEntries,
  roleChangeError,
  roleChangeSuccess,
  pendingRoleAction,
  pendingRolePhone,
  pendingRoleValue,
  onShopTimingDraftChange,
  onSaveShopTiming,
  onAssignUserRole,
  onRemoveUserRole,
}: StaffProfileAdminControlsProps) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<ManagedUserRole>('admin');

  useEffect(() => {
    if (pendingRoleAction !== '' || !roleChangeSuccess) {
      return;
    }

    setPhoneInput('');
    setSelectedRole('admin');
  }, [pendingRoleAction, roleChangeSuccess]);

  if (!canAccessAdminPanel) {
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

      {isOwner && (
        <div className="coffee-surface-soft rounded-[26px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
            Owner Controls
          </p>
          <h3 className="mt-1 text-lg font-semibold text-accent">User Role Management</h3>
          <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-ink-muted">
            Roles are stored in user_roles/{'{phone}'} and update active sessions in real time.
          </div>

          <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="coffee-input"
                  value={phoneInput}
                  onChange={event => setPhoneInput(event.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  Role
                </label>
                <select
                  className="coffee-input"
                  value={selectedRole}
                  onChange={event => setSelectedRole(event.target.value as ManagedUserRole)}
                >
                  <option value="admin">Admin</option>
                  <option value="delivery_agent">Delivery Agent</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAssignUserRole(phoneInput, selectedRole)}
              disabled={pendingRoleAction === 'assign'}
              className="coffee-btn-primary mt-3 w-full justify-center disabled:opacity-70"
            >
              {pendingRoleAction === 'assign' ? 'Saving role...' : 'Add Role'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {userRoleEntries.length === 0 ? (
              <p className="text-sm text-ink-muted">No admin or delivery assignments have been created yet.</p>
            ) : (
              userRoleEntries.map(entry => {
                const isRemoving =
                  pendingRoleAction === 'remove' &&
                  pendingRolePhone === entry.phone;

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
                          {ROLE_LABEL[entry.role as ManagedUserRole]}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => onRemoveUserRole(entry)}
                        className="rounded-[14px] border border-primary/25 bg-primary/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isRemoving ? 'Removing' : 'Remove'}
                      </button>
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

          {pendingRoleAction === 'assign' && pendingRolePhone && pendingRoleValue && (
            <p className="mt-3 text-xs text-ink-muted">
              Saving {ROLE_LABEL[pendingRoleValue]} access for {formatPhoneForDisplay(pendingRolePhone)}.
            </p>
          )}
        </div>
      )}
    </>
  );
};
