export const OrdersPageSkeleton = () => (
  <div className="px-4 pb-28 sm:px-6">
    <div className="mx-auto max-w-screen-md space-y-8">
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <section key={sectionIndex}>
          <div className="mb-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="h-8 w-40 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="h-8 w-12 animate-pulse rounded-full bg-white/10" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, cardIndex) => (
              <article key={cardIndex} className="coffee-surface-soft rounded-[24px] p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
                    <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
                    <div className="h-3 w-32 animate-pulse rounded-full bg-white/8" />
                  </div>
                  <div className="h-8 w-32 animate-pulse rounded-full bg-white/10" />
                </div>

                <div className="mt-4 h-4 w-4/5 animate-pulse rounded-full bg-white/8" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/8" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/8" />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
                  <div className="h-3 w-12 animate-pulse rounded-full bg-white/8" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-white/10" />
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);
