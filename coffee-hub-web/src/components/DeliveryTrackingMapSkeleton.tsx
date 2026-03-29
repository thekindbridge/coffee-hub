type DeliveryTrackingMapSkeletonProps = {
  className?: string;
  mapClassName?: string;
};

export const DeliveryTrackingMapSkeleton = ({
  className = '',
  mapClassName = 'h-[420px] w-full sm:h-[560px]',
}: DeliveryTrackingMapSkeletonProps) => (
  <section
    className={`relative w-full overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,#18110d,#0f0a08)] shadow-[0_30px_80px_rgba(9,6,5,0.34)] ${className}`.trim()}
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-5 py-4">
      <div className="h-3 w-28 animate-pulse rounded-full bg-white/12" />
      <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
    </div>

    <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)] ${mapClassName}`.trim()}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_45%,rgba(255,255,255,0.02))]" />
      <div className="absolute left-8 top-14 h-5 w-5 animate-pulse rounded-full bg-secondary/70 shadow-[0_0_0_8px_rgba(192,138,93,0.12)]" />
      <div className="absolute bottom-16 right-10 h-5 w-5 animate-pulse rounded-full bg-highlight/80 shadow-[0_0_0_8px_rgba(244,193,110,0.12)]" />
      <div className="absolute left-[18%] top-[32%] h-1.5 w-[58%] -rotate-12 rounded-full bg-white/12" />
      <div className="absolute left-[24%] top-[45%] h-1.5 w-[42%] rotate-6 rounded-full bg-secondary/50" />
      <div className="absolute inset-x-6 bottom-6 rounded-[22px] border border-white/8 bg-[#120d0b]/88 px-4 py-4">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/12" />
        <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-white/12" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  </section>
);
