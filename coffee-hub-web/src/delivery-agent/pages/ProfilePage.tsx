import { PencilLine, Phone, Save, UserCircle2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatPhoneForDisplay } from '../../../shared/phone';
import { saveDeliveryAgentProfileDetails } from '../../services/firebase/profileService';
import { bodyScrollAdapter } from '../../services/platform/bodyScrollAdapter';
import type { DeliveryAgent } from '../../types';
import { formatAgentAvailabilityLabel } from '../utils/orderHelpers';

export interface ProfilePageProps {
  currentUserId: string;
  currentUserPhone: string;
  deliveryAgent: DeliveryAgent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfilePage = ({
  currentUserId,
  currentUserPhone,
  deliveryAgent,
  isOpen,
  onClose,
}: ProfilePageProps) => {
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const availabilityLabel = formatAgentAvailabilityLabel(deliveryAgent);
  const agentId = useMemo(
    () => deliveryAgent?.id || currentUserPhone,
    [currentUserPhone, deliveryAgent?.id],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftName(deliveryAgent?.name || '');
    setDraftPhone(deliveryAgent?.phone || currentUserPhone);
    setError('');
    setIsEditing(false);
    setIsSaving(false);
    setSuccessMessage('');
  }, [currentUserPhone, deliveryAgent?.name, deliveryAgent?.phone, isOpen]);

  useEffect(() => {
    if (!isOpen || !successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('');
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, successMessage]);

  useEffect(() => {
    bodyScrollAdapter.setLocked(isOpen);

    return () => {
      bodyScrollAdapter.setLocked(false);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    if (!agentId) {
      setError('Unable to find this delivery profile right now.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      await saveDeliveryAgentProfileDetails({
        agentId,
        currentUserId,
        name: draftName,
        phone: draftPhone,
      });
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save profile right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = draftName.trim().length > 0 && draftPhone.trim().length > 0;

  return (
    <div className="app-modal-backdrop fixed inset-0 z-[98] backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-screen-md flex-col px-4 py-5 sm:px-6">
        <section className="coffee-surface flex h-full flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-[var(--app-surface-border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8b6145,#4e3427)] shadow-[0_14px_30px_rgba(62,39,35,0.24)]">
                <UserCircle2 className="text-accent" size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                  Delivery Profile
                </p>
                <p className="mt-1 text-sm font-semibold text-accent">
                  Manage your delivery details
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="coffee-icon-btn"
              aria-label="Close delivery profile"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <section className="coffee-surface-soft p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-secondary">
                    <UserCircle2 size={16} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                      Agent Identity
                    </p>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-ink">
                    {draftName.trim() || 'Delivery Partner'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    Keep your visible name and delivery contact updated for smoother order handoffs.
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                    availabilityLabel === 'Online'
                      ? 'border-emerald-400/30 bg-emerald-500/14 text-emerald-200'
                      : 'border-white/12 bg-white/8 text-ink-muted'
                  }`}
                >
                  {availabilityLabel}
                </span>
              </div>
            </section>

            <section className="mt-4 coffee-surface-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                    Edit Profile
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Update the delivery profile details shown inside the app.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(previous => !previous);
                    setError('');
                    setSuccessMessage('');
                    if (isEditing) {
                      setDraftName(deliveryAgent?.name || '');
                      setDraftPhone(deliveryAgent?.phone || currentUserPhone);
                    }
                  }}
                  className="coffee-btn-secondary shrink-0"
                >
                  <PencilLine size={16} />
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                    Name
                  </label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={event => setDraftName(event.target.value)}
                    className="coffee-input"
                    placeholder="Enter delivery partner name"
                    disabled={!isEditing || isSaving}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="tel"
                      value={draftPhone}
                      onChange={event => setDraftPhone(event.target.value)}
                      className="coffee-input pl-11"
                      placeholder="+91 9876543210"
                      disabled={!isEditing || isSaving}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    This updates the delivery contact shown in the agent profile without reloading the app.
                  </p>
                </div>

                {!isEditing && (
                  <div className="app-muted-panel rounded-[20px] px-4 py-3 text-sm text-ink-muted">
                    Current contact: {deliveryAgent?.phone ? formatPhoneForDisplay(deliveryAgent.phone) : formatPhoneForDisplay(currentUserPhone)}
                  </div>
                )}

                {error ? (
                  <div className="rounded-[20px] border border-rose-300/24 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                    {error}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-[20px] border border-emerald-300/24 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSave();
                    }}
                    disabled={!canSave || isSaving}
                    className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving profile...' : 'Save Profile'}
                  </button>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
