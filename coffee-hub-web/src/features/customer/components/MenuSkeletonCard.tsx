export const MenuSkeletonCard = () => (
  <div className="coffee-surface overflow-hidden rounded-[22px]">
    <div className="coffee-skeleton aspect-[4/3]" />
    <div className="space-y-2 p-3">
      <div className="coffee-skeleton h-4 w-3/4 rounded-full" />
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="coffee-skeleton h-4 w-16 rounded-full" />
        <div className="coffee-skeleton h-5 w-14 rounded-full" />
      </div>
      <div className="coffee-skeleton h-9 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-2">
        <div className="coffee-skeleton h-7 w-full rounded-full" />
        <div className="coffee-skeleton h-7 w-full rounded-full" />
      </div>
    </div>
  </div>
);
