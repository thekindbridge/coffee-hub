import { UserCircle2 } from 'lucide-react';
import type { AgentStatus } from '../../features/app/types';
import type { DeliveryAgent } from '../../types';

export interface ProfilePageProps {
  deliveryAgent: DeliveryAgent | null;
  isAvailabilitySaving?: boolean;
  onAvailabilityChange?: (status: AgentStatus) => void | Promise<void>;
}

export const ProfilePage = ({
  deliveryAgent,
  isAvailabilitySaving = false,
  onAvailabilityChange,
}: ProfilePageProps) => (
  <section className="space-y-4">
    <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 text-[#fff8f2] shadow-[0_22px_60px_rgba(9,6,5,0.24)]">
      <div className="flex items-center gap-2 text-[#f0b173]">
        <UserCircle2 size={16} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em]">
          Delivery Profile
        </p>
      </div>

      <h2 className="mt-3 text-2xl font-semibold">
        {deliveryAgent?.name || 'Delivery partner'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#cdbbaa]">
        Keep this profile minimal and focused for active delivery operations.
      </p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-[26px] border border-white/10 bg-white/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Name</p>
        <p className="mt-2 text-lg font-black text-ink">{deliveryAgent?.name || 'Not added'}</p>
      </article>

      <article className="rounded-[26px] border border-white/10 bg-white/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Phone</p>
        <p className="mt-2 text-lg font-black text-ink">{deliveryAgent?.phone || 'Not added'}</p>
      </article>

      <article className="rounded-[26px] border border-white/10 bg-white/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Availability</p>
        <p className="mt-2 text-lg font-black capitalize text-ink">
          {deliveryAgent?.status || (deliveryAgent?.is_active ? 'available' : 'offline')}
        </p>
        {onAvailabilityChange && (
          <div className="mt-4 flex gap-2">
            {(['Available', 'Offline'] as AgentStatus[]).map(status => {
              const isActive = (
                deliveryAgent?.status || (deliveryAgent?.is_active ? 'available' : 'offline')
              ).toLowerCase() === status.toLowerCase();

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    void onAvailabilityChange(status);
                  }}
                  disabled={isAvailabilitySaving || isActive}
                  className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    isActive
                      ? 'border border-[#d7b26d]/40 bg-[#d7b26d]/14 text-[#f4d58e]'
                      : 'border border-white/10 bg-white/5 text-ink-muted hover:text-accent'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isAvailabilitySaving && isActive ? 'Saving...' : status}
                </button>
              );
            })}
          </div>
        )}
      </article>
    </div>
  </section>
);

export default ProfilePage;
