import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react';
import { formatPhoneForDisplay } from '../../../shared/phone';
import { NotificationSettingsPanel } from '../../components/NotificationSettingsPanel';
import type { NotificationPermissionState } from '../../services/platform/notificationAdapter';
import { StaffProfileAdminControls } from '../staff/components/StaffProfileAdminControls';
import { ensureProfileAddresses } from '../app/lib/firestoreMappers';
import type {
  AccessEntry,
  AgentStatus,
  AgentVehicleType,
  CustomerProfile,
  ManagedUserRole,
  ShopTimingDraft,
} from '../app/types';
import { type ShopTiming } from '../../../shared/shopTiming';
import type { UserRole } from '../../../shared/userRole';

type ProfileScreenProps = {
  isOpen: boolean;
  canAccessAdminPanel: boolean;
  isDeliveryAgent: boolean;
  isOwner: boolean;
  role: UserRole;
  profileDraft: CustomerProfile;
  profileError: string;
  profileSyncError: string;
  isProfileSaving: boolean;
  isProfileSavedToastVisible: boolean;
  isProfileAddressExpanded: boolean;
  notificationPermissionState: NotificationPermissionState;
  isNotificationSyncing: boolean;
  notificationSyncError: string;
  shopTiming: ShopTiming;
  shopTimingDraft: ShopTimingDraft;
  shopTimingError: string;
  shopTimingSuccess: string;
  isShopTimingSaving: boolean;
  deliveryChargeDraft: string;
  deliveryChargeError: string;
  deliveryChargeSuccess: string;
  isDeliveryChargeSaving: boolean;
  userRoleEntries: AccessEntry[];
  roleChangeError: string;
  roleChangeSuccess: string;
  pendingRoleAction: 'assign' | 'remove' | '';
  pendingRolePhone: string;
  pendingRoleValue: ManagedUserRole | '';
  onClose: () => void;
  onLogout: () => void;
  onSave: () => void;
  onEnablePushNotifications: () => void;
  onNotificationSettingsChange: (settings: CustomerProfile['notificationSettings']) => void;
  onProfileDraftChange: (profile: CustomerProfile) => void;
  onProfileAddressExpandedChange: (isExpanded: boolean) => void;
  onShopTimingDraftChange: (draft: ShopTimingDraft) => void;
  onSaveShopTiming: () => void;
  onDeliveryChargeDraftChange: (value: string) => void;
  onSaveDeliveryCharge: () => void;
  onAssignUserRole: (phone: string, role: ManagedUserRole) => void;
  onRemoveUserRole: (entry: AccessEntry) => void;
};

const roleLabel: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  delivery_agent: 'Delivery Agent',
  customer: 'Customer',
};

export const ProfileScreen = ({
  isOpen,
  canAccessAdminPanel,
  isDeliveryAgent,
  isOwner,
  role,
  profileDraft,
  profileError,
  profileSyncError,
  isProfileSaving,
  isProfileSavedToastVisible,
  isProfileAddressExpanded,
  notificationPermissionState,
  isNotificationSyncing,
  notificationSyncError,
  shopTiming,
  shopTimingDraft,
  shopTimingError,
  shopTimingSuccess,
  isShopTimingSaving,
  deliveryChargeDraft,
  deliveryChargeError,
  deliveryChargeSuccess,
  isDeliveryChargeSaving,
  userRoleEntries,
  roleChangeError,
  roleChangeSuccess,
  pendingRoleAction,
  pendingRolePhone,
  pendingRoleValue,
  onClose,
  onLogout,
  onSave,
  onEnablePushNotifications,
  onNotificationSettingsChange,
  onProfileDraftChange,
  onProfileAddressExpandedChange,
  onShopTimingDraftChange,
  onSaveShopTiming,
  onDeliveryChargeDraftChange,
  onSaveDeliveryCharge,
  onAssignUserRole,
  onRemoveUserRole,
}: ProfileScreenProps) => {
  const nameLabel = isDeliveryAgent ? 'Agent Name' : 'Name';

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
                      Coffee Hub Profile
                    </p>
                    <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">Account details</h2>
                  </div>
                  <button onClick={onClose} className="coffee-icon-btn">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isProfileSavedToastVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pt-4"
                  >
                    <div className="flex items-center gap-2 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 size={14} />
                      Profile saved successfully
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-5 px-5 pb-6 pt-4">
                <div className="coffee-surface-soft rounded-[26px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                      Profile Information
                    </p>
                    <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">
                      {roleLabel[role]}
                    </span>
                  </div>
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
                          value={profileDraft.name}
                          onChange={event => onProfileDraftChange({ ...profileDraft, name: event.target.value })}
                          placeholder={isDeliveryAgent ? 'Agent name' : 'Your name'}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Verified Mobile Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="tel"
                          className="coffee-input pl-10 opacity-80"
                          value={formatPhoneForDisplay(profileDraft.phone)}
                          readOnly
                        />
                      </div>
                      <p className="mt-2 text-xs text-ink-muted">
                        This number comes from Firebase Phone Authentication and cannot be edited here.
                      </p>
                    </div>
                  </div>
                </div>

                {canAccessAdminPanel && (
                  <div className="coffee-surface-soft rounded-[26px] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                      {isOwner ? 'Owner Settings' : 'Admin Settings'}
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-ink">
                        <ShieldCheck size={16} className="text-secondary" />
                        {isOwner ? 'Owner' : 'Admin'} - Coffee Hub management
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Admin Location
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <input
                            type="text"
                            className="coffee-input pl-10"
                            value={profileDraft.adminLocation}
                            onChange={event => onProfileDraftChange({ ...profileDraft, adminLocation: event.target.value })}
                            placeholder="Coffee Hub Inkollu"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDeliveryAgent && (
                  <div className="coffee-surface-soft rounded-[26px] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                      Delivery Controls
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Vehicle Type
                        </label>
                        <div className="relative">
                          <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <select
                            className="coffee-input pl-10 pr-10"
                            value={profileDraft.vehicleType}
                            onChange={event => onProfileDraftChange({
                              ...profileDraft,
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
                          Availability
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['Available', 'Offline'] as AgentStatus[]).map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => onProfileDraftChange({ ...profileDraft, status })}
                              className={`rounded-[8px] border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                                profileDraft.status === status
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

                {!canAccessAdminPanel && !isDeliveryAgent && (
                  <div className="coffee-surface-soft rounded-[26px] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                      Orders and Addresses
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Save up to 3 delivery locations for faster checkout.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Primary Address
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-4 h-4 w-4 text-ink-muted" />
                          <textarea
                            className="coffee-textarea pl-10"
                            value={profileDraft.addresses[0] || ''}
                            onChange={event => {
                              const nextAddresses = ensureProfileAddresses(profileDraft.addresses);
                              nextAddresses[0] = event.target.value;
                              onProfileDraftChange({ ...profileDraft, addresses: nextAddresses });
                            }}
                            placeholder="Street, landmark, city"
                          />
                        </div>
                      </div>
                      <AnimatePresence initial={false}>
                        {isProfileAddressExpanded && (
                          <motion.div
                            key="profile-more-addresses"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="space-y-3 overflow-hidden"
                          >
                            {[1, 2].map(index => (
                              <div key={`profile-address-${index}`}>
                                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                                  Address {index + 1}
                                </label>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-4 h-4 w-4 text-ink-muted" />
                                  <textarea
                                    className="coffee-textarea pl-10"
                                    value={profileDraft.addresses[index] || ''}
                                    onChange={event => {
                                      const nextAddresses = ensureProfileAddresses(profileDraft.addresses);
                                      nextAddresses[index] = event.target.value;
                                      onProfileDraftChange({ ...profileDraft, addresses: nextAddresses });
                                    }}
                                    placeholder="Street, landmark, city"
                                  />
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      type="button"
                      onClick={() => onProfileAddressExpandedChange(!isProfileAddressExpanded)}
                      className="coffee-btn-secondary mt-4 w-full justify-center"
                    >
                      {isProfileAddressExpanded ? 'Hide Addresses' : 'View More Addresses'}
                    </button>
                  </div>
                )}

                <StaffProfileAdminControls
                  role={role}
                  canAccessAdminPanel={canAccessAdminPanel}
                  isOwner={isOwner}
                  shopTiming={shopTiming}
                  shopTimingDraft={shopTimingDraft}
                  shopTimingError={shopTimingError}
                  shopTimingSuccess={shopTimingSuccess}
                  isShopTimingSaving={isShopTimingSaving}
                  deliveryChargeDraft={deliveryChargeDraft}
                  deliveryChargeError={deliveryChargeError}
                  deliveryChargeSuccess={deliveryChargeSuccess}
                  isDeliveryChargeSaving={isDeliveryChargeSaving}
                  userRoleEntries={userRoleEntries}
                  roleChangeError={roleChangeError}
                  roleChangeSuccess={roleChangeSuccess}
                  pendingRoleAction={pendingRoleAction}
                  pendingRolePhone={pendingRolePhone}
                  pendingRoleValue={pendingRoleValue}
                  onShopTimingDraftChange={onShopTimingDraftChange}
                  onSaveShopTiming={onSaveShopTiming}
                  onDeliveryChargeDraftChange={onDeliveryChargeDraftChange}
                  onSaveDeliveryCharge={onSaveDeliveryCharge}
                  onAssignUserRole={onAssignUserRole}
                  onRemoveUserRole={onRemoveUserRole}
                />

                <NotificationSettingsPanel
                  settings={profileDraft.notificationSettings}
                  permissionState={notificationPermissionState}
                  isSyncing={isNotificationSyncing}
                  syncError={notificationSyncError}
                  onEnablePush={onEnablePushNotifications}
                  onSettingsChange={onNotificationSettingsChange}
                />

                {(profileError || profileSyncError) && (
                  <div className="rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                    {profileError || profileSyncError}
                  </div>
                )}
              </div>

              <div className="border-t border-white/6 bg-[#0f0b09]/94 px-5 pb-20 pt-4">
                <button
                  onClick={onSave}
                  disabled={isProfileSaving}
                  className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                >
                  {isProfileSaving ? 'Saving profile...' : 'Save Profile'}
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
