import { DeliveryTrackingMapSkeleton } from '../../../components/DeliveryTrackingMapSkeleton';

export const TrackingPageSkeleton = () => (
  <div className="px-4 pb-24 sm:px-6">
    <div className="mx-auto max-w-screen-lg space-y-4">
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#18110d,#0f0a08)] px-5 py-5 shadow-[0_18px_50px_rgba(8,5,4,0.24)]">
        <div className="h-3 w-28 animate-pulse rounded-full bg-white/12" />
        <div className="mt-3 h-9 w-40 animate-pulse rounded-full bg-white/12" />
        <div className="mt-4 h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#17110d,#0f0a08)] p-5 shadow-[0_18px_50px_rgba(9,6,5,0.22)]">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/12" />
        <div className="mt-3 h-6 w-32 animate-pulse rounded-full bg-white/12" />
        <div className="mt-5 h-24 animate-pulse rounded-[24px] bg-white/6" />
      </div>

      <DeliveryTrackingMapSkeleton mapClassName="h-[520px] w-full sm:h-[640px] lg:h-[720px]" />
    </div>
  </div>
);
