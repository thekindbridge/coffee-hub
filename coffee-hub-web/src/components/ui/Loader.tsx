import { Coffee, LoaderCircle } from 'lucide-react';

type LoaderProps = {
  className?: string;
  fullScreen?: boolean;
  label?: string;
  minHeightClassName?: string;
};

export const Loader = ({
  className = '',
  fullScreen = false,
  label = 'Loading Coffee Hub...',
  minHeightClassName,
}: LoaderProps) => {
  const minHeight = fullScreen ? 'min-h-screen' : minHeightClassName ?? 'min-h-[280px]';

  return (
    <div className={`flex w-full items-center justify-center px-4 py-6 ${minHeight} ${className}`.trim()}>
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] px-6 py-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.26)]">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-secondary">
          <Coffee size={20} className="relative z-10" />
          <LoaderCircle size={36} className="absolute animate-spin text-secondary/60" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
            Preparing
          </p>
          <p className="mt-2 text-sm font-medium text-accent">{label}</p>
        </div>
      </div>
    </div>
  );
};
