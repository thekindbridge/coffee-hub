import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, LogOut, Mail, MapPin, Phone, User, X } from 'lucide-react';
import { NotificationSettingsPanel } from '../../../components/NotificationSettingsPanel';
import type { PushPermissionState } from '../../../services/browser/pushNotificationsService';
import { ensureProfileAddresses } from '../../app/lib/firestoreMappers';
import type { CustomerProfile } from '../../app/types';

type CustomerProfileDrawerProps = {
  isOpen: boolean;
  profileDraft: CustomerProfile;
  profileError: string;
  isProfileSaving: boolean;
  isProfileSavedToastVisible: boolean;
  isProfileAddressExpanded: boolean;
  notificationPermissionState: PushPermissionState;
  isNotificationSyncing: boolean;
  notificationSyncError: string;
  onClose: () => void;
  onLogout: () => void;
  onSave: () => void;
  onEnablePushNotifications: () => void;
  onNotificationSettingsChange: (settings: CustomerProfile['notificationSettings']) => void;
  onProfileDraftChange: (profile: CustomerProfile) => void;
  onProfileAddressExpandedChange: (isExpanded: boolean) => void;
};

export const CustomerProfileDrawer = ({
  isOpen,
  profileDraft,
  profileError,
  isProfileSaving,
  isProfileSavedToastVisible,
  isProfileAddressExpanded,
  notificationPermissionState,
  isNotificationSyncing,
  notificationSyncError,
  onClose,
  onLogout,
  onSave,
  onEnablePushNotifications,
  onNotificationSettingsChange,
  onProfileDraftChange,
  onProfileAddressExpandedChange,
}: CustomerProfileDrawerProps) => (
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
          className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] shadow-[0_0_60px_rgba(0,0,0,0.45)]"
        >
          <div className="border-b border-white/6 px-5 pb-4 pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
                  Customer Profile
                </p>
                <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">Profile details</h2>
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
                  Profile Saved Successfully
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-6 pt-4">
            <div className="coffee-surface-soft rounded-[26px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                Profile Information
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                    Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      className="coffee-input pl-10"
                      value={profileDraft.name}
                      onChange={event =>
                        onProfileDraftChange({ ...profileDraft, name: event.target.value })
                      }
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
                      value={profileDraft.phone}
                      onChange={event =>
                        onProfileDraftChange({ ...profileDraft, phone: event.target.value })
                      }
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
                      value={profileDraft.email}
                      onChange={event =>
                        onProfileDraftChange({ ...profileDraft, email: event.target.value })
                      }
                      placeholder="name@email.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="coffee-surface-soft rounded-[26px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                Delivery Addresses
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

            <NotificationSettingsPanel
              settings={profileDraft.notificationSettings}
              permissionState={notificationPermissionState}
              isSyncing={isNotificationSyncing}
              syncError={notificationSyncError}
              onEnablePush={onEnablePushNotifications}
              onSettingsChange={onNotificationSettingsChange}
            />

            {profileError && (
              <div className="rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                {profileError}
              </div>
            )}
          </div>

          <div className="border-t border-white/6 bg-[#0f0b09]/94 px-5 py-4">
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
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
