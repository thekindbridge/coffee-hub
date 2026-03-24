import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Clock3,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react';
import { ADMIN_EMAIL } from '../../app/lib/constants';
import type {
  AccessEntry,
  AgentStatus,
  AgentVehicleType,
  ShopTimingDraft,
  StaffProfile,
} from '../../app/types';
import {
  formatShopTimingRange,
  type ShopTiming,
} from '../../../../shared/shopTiming';
import { NotificationSettingsPanel, type PushPermissionState } from '../../../components/NotificationSettingsPanel';

type StaffProfileDrawerProps = {
  isOpen: boolean;
  isAdmin: boolean;
  isDeliveryAgent: boolean;
  isMainAdmin: boolean;
  staffProfileDraft: StaffProfile;
  staffProfileError: string;
  isStaffProfileSaving: boolean;
  isStaffProfileSavedToastVisible: boolean;
  notificationPermissionState: PushPermissionState;
  isNotificationSyncing: boolean;
  notificationSyncError: string;
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
  onClose: () => void;
  onLogout: () => void;
  onSave: () => void;
  onEnablePushNotifications: () => void;
  onNotificationSettingsChange: (settings: StaffProfile['notificationSettings']) => void;
  onStaffProfileDraftChange: (profile: StaffProfile) => void;
  onShopTimingDraftChange: (draft: ShopTimingDraft) => void;
  onSaveShopTiming: () => void;
  onAdminAccessInputChange: (value: string) => void;
  onDeliveryAccessInputChange: (value: string) => void;
  onAddAdminAccess: () => void;
  onRemoveAdminAccess: (entry: AccessEntry) => void;
  onAddDeliveryAccess: () => void;
  onRemoveDeliveryAccess: (entry: AccessEntry) => void;
};

export const StaffProfileDrawer = ({
  isOpen,
  isAdmin,
  isDeliveryAgent,
  isMainAdmin,
  staffProfileDraft,
  staffProfileError,
  isStaffProfileSaving,
  isStaffProfileSavedToastVisible,
  notificationPermissionState,
  isNotificationSyncing,
  notificationSyncError,
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
  onClose,
  onLogout,
  onSave,
  onEnablePushNotifications,
  onNotificationSettingsChange,
  onStaffProfileDraftChange,
  onShopTimingDraftChange,
  onSaveShopTiming,
  onAdminAccessInputChange,
  onDeliveryAccessInputChange,
  onAddAdminAccess,
  onRemoveAdminAccess,
  onAddDeliveryAccess,
  onRemoveDeliveryAccess,
}: StaffProfileDrawerProps) => {
  if (!isAdmin && !isDeliveryAgent) {
    return null;
  }

  const profileTitle = isAdmin ? 'Admin Profile' : 'Agent Profile';
  const profileSubtitle = isAdmin ? 'Coffee Hub Management' : 'Delivery operations';
  const nameLabel = isAdmin ? 'Name' : 'Agent Name';
  const currentShopTimingLabel = formatShopTimingRange(shopTiming.openTime, shopTiming.closeTime);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed left-0 right-0 top-0 z-[90] h-screen"
          >
            <div
              className="relative ml-auto flex h-screen w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] shadow-[0_0_60px_rgba(0,0,0,0.45)]"
              style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth', height: '100vh' }}
            >
              <div className="sticky top-0 z-10 border-b border-white/6 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] px-5 pb-4 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
                      {profileTitle}
                    </p>
                    <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">{profileSubtitle}</h2>
                  </div>
                  <button onClick={onClose} className="coffee-icon-btn">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isStaffProfileSavedToastVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pt-4"
                  >
                    <div className="flex items-center gap-2 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 size={14} />
                      Profile Saved Successfully
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-5 px-5 pb-6 pt-4">
                <div className="coffee-surface-soft rounded-[26px] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                    Profile Information
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        {nameLabel}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="text"
                          className="coffee-input pl-10"
                          value={staffProfileDraft.name}
                          onChange={event => onStaffProfileDraftChange({ ...staffProfileDraft, name: event.target.value })}
                          placeholder={isAdmin ? 'Admin name' : 'Agent name'}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">
                          +91
                        </span>
                        <input
                          type="tel"
                          className="coffee-input pl-16"
                          value={staffProfileDraft.phone}
                          onChange={event => onStaffProfileDraftChange({ ...staffProfileDraft, phone: event.target.value })}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Email (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="email"
                          className="coffee-input pl-10"
                          value={staffProfileDraft.email}
                          onChange={event => onStaffProfileDraftChange({ ...staffProfileDraft, email: event.target.value })}
                          placeholder="name@email.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="coffee-surface-soft rounded-[26px] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                      Admin Details
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Admin Role
                        </label>
                        <div className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-ink">
                          <ShieldCheck size={16} className="text-secondary" />
                          Admin - Coffee Hub Management
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Admin Location (Optional)
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <input
                            type="text"
                            className="coffee-input pl-10"
                            value={staffProfileDraft.adminLocation}
                            onChange={event => onStaffProfileDraftChange({ ...staffProfileDraft, adminLocation: event.target.value })}
                            placeholder="Coffee Hub Inkollu"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAdmin && (
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
                        Use 24-hour values from 0 to 23. Orders are accepted from the opening hour until the closing hour starts.
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Open Time
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          className="coffee-input"
                          value={shopTimingDraft.openTime}
                          onChange={event => onShopTimingDraftChange({
                            ...shopTimingDraft,
                            openTime: event.target.value,
                          })}
                          placeholder="6"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Close Time
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          className="coffee-input"
                          value={shopTimingDraft.closeTime}
                          onChange={event => onShopTimingDraftChange({
                            ...shopTimingDraft,
                            closeTime: event.target.value,
                          })}
                          placeholder="22"
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
                )}

                {isAdmin && (
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
                )}

                {isAdmin && (
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
                )}

                {isDeliveryAgent && (
                  <div className="coffee-surface-soft rounded-[26px] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                      Agent Details
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Vehicle Type (Optional)
                        </label>
                        <div className="relative">
                          <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <select
                            className="coffee-input pl-10 pr-10"
                            value={staffProfileDraft.vehicleType}
                            onChange={event => onStaffProfileDraftChange({
                              ...staffProfileDraft,
                              vehicleType: event.target.value as AgentVehicleType,
                            })}
                          >
                            <option value="">Select vehicle</option>
                            <option value="Bike">Bike</option>
                            <option value="Scooter">Scooter</option>
                            <option value="Cycle">Cycle</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Agent Status
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['Available', 'Offline'] as AgentStatus[]).map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => onStaffProfileDraftChange({ ...staffProfileDraft, status })}
                              className={`rounded-2xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                                staffProfileDraft.status === status
                                  ? 'border-secondary/40 bg-[linear-gradient(135deg,rgba(111,78,55,0.6),rgba(62,39,35,0.92))] text-accent shadow-[0_10px_24px_rgba(62,39,35,0.24)]'
                                  : 'border-white/10 bg-white/5 text-ink-muted hover:bg-white/8'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <NotificationSettingsPanel
                  settings={staffProfileDraft.notificationSettings}
                  permissionState={notificationPermissionState}
                  isSyncing={isNotificationSyncing}
                  syncError={notificationSyncError}
                  onEnablePush={onEnablePushNotifications}
                  onSettingsChange={onNotificationSettingsChange}
                />

                {staffProfileError && (
                  <div className="rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                    {staffProfileError}
                  </div>
                )}
              </div>

              <div className="border-t border-white/6 bg-[#0f0b09]/94 px-5 pb-20 pt-4">
                <button
                  onClick={onSave}
                  disabled={isStaffProfileSaving}
                  className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                >
                  {isStaffProfileSaving ? 'Saving profile...' : 'Save Profile'}
                </button>
                <button
                  onClick={onLogout}
                  className="coffee-btn-secondary mt-3 w-full justify-center"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
