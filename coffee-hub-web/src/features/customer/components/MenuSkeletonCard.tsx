export const MenuSkeletonCard = () => (
  <div className="coffee-surface overflow-hidden rounded-[26px]">
    <div className="coffee-skeleton aspect-[1.06]" />
    <div className="space-y-3 p-3.5">
      <div className="coffee-skeleton h-4 w-2/3 rounded-full" />
      <div className="coffee-skeleton h-3 w-full rounded-full" />
      <div className="coffee-skeleton h-3 w-4/5 rounded-full" />
      <div className="flex items-center justify-between pt-2">
        <div className="coffee-skeleton h-4 w-16 rounded-full" />
        <div className="coffee-skeleton h-10 w-24 rounded-full" />
      </div>
    </div>
  </div>
);
