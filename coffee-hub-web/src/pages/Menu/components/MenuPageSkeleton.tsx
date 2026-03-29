import { MenuSkeletonCard } from '../../../features/customer/components/MenuSkeletonCard';

type MenuPageSkeletonProps = {
  hasStatusBanner: boolean;
};

export const MenuPageSkeleton = ({ hasStatusBanner }: MenuPageSkeletonProps) => (
  <div
    className={`px-4 pb-28 sm:px-6 ${
      hasStatusBanner ? 'pt-2 sm:pt-3' : 'pt-20'
    }`}
  >
    <div className="mx-auto max-w-screen-md">
      <div className="sticky top-[72px] z-30 rounded-[28px] border border-white/8 bg-[#0f0b09]/88 px-3 py-3 backdrop-blur-xl">
        <div className="h-12 animate-pulse rounded-[20px] bg-white/8" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 w-24 animate-pulse rounded-full bg-white/8" />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-8 w-56 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 pb-28 sm:grid-cols-2 sm:pb-32 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <MenuSkeletonCard key={index} />
        ))}
      </div>
    </div>
  </div>
);
