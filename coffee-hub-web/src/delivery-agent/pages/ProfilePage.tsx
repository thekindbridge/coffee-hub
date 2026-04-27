import { Power, UserCircle2 } from 'lucide-react';
import { formatPhoneForDisplay } from '../../../shared/phone';
import type { AgentStatus } from '../../features/app/types';
import type { DeliveryAgent } from '../../types';
import { formatAgentAvailabilityLabel } from '../utils/orderHelpers';

export interface ProfilePageProps {
  deliveryAgent: DeliveryAgent | null;
  isAvailabilitySaving?: boolean;
  onAvailabilityChange?: (status: AgentStatus) => void | Promise<void>;
}

export const ProfilePage = ({
  deliveryAgent,
  isAvailabilitySaving = false,
  onAvailabilityChange,
}: ProfilePageProps) => {
  const availabilityLabel = formatAgentAvailabilityLabel(deliveryAgent);

  return (
    <section className="space-y-4">
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_22px_60px_rgba(9,6,5,0.24)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#f0b173]">
              <UserCircle2 size={16} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">
                Delivery Profile
              </p>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
              {deliveryAgent?.name || 'Delivery partner'}
            </h2>
          </div>

          <div
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${
              availabilityLabel === 'Online'
                ? 'border-emerald-400/30 bg-emerald-500/14 text-emerald-200'
                : 'border-white/12 bg-white/6 text-ink-muted'
            }`}
          >
            {availabilityLabel}
          </div>
        </div>

        <p className="mt-2 text-sm leading-6 text-[#cdbbaa]">
          Keep your details sharp and stay available when you are ready to take the next run.
        </p>
      </div>

      <div className="coffee-surface-soft rounded-[28px] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
          Agent Details
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/10 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Name
            </span>
            <span className="text-sm font-semibold text-ink">
              {deliveryAgent?.name || 'Not added'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/10 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Phone
            </span>
            <span className="text-sm font-semibold text-ink">
              {deliveryAgent?.phone ? formatPhoneForDisplay(deliveryAgent.phone) : 'Not added'}
            </span>
          </div>
        </div>
      </div>

      <div className="coffee-surface-soft rounded-[28px] p-4">
        <div className="flex items-center gap-2">
          <Power size={16} className="text-secondary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
            Availability
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(['Available', 'Offline'] as AgentStatus[]).map(status => {
            const isActive = availabilityLabel.toLowerCase() === (status === 'Available' ? 'online' : 'offline');

            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  void onAvailabilityChange?.(status);
                }}
                disabled={isAvailabilitySaving || isActive}
                className={`inline-flex min-h-12 items-center justify-center rounded-[20px] px-4 text-sm font-semibold transition ${
                  isActive
                    ? status === 'Available'
                      ? 'border border-emerald-400/30 bg-emerald-500/14 text-emerald-200'
                      : 'border border-white/12 bg-white/8 text-accent'
                    : 'border border-white/10 bg-white/5 text-ink-muted hover:bg-white/8 hover:text-accent'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {isAvailabilitySaving && isActive ? 'Saving...' : status === 'Available' ? 'Go Online' : 'Go Offline'}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
