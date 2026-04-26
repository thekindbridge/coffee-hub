import { WifiOff } from 'lucide-react';

type NetworkStatusBannerProps = {
  isOffline: boolean;
};

export const NetworkStatusBanner = ({ isOffline }: NetworkStatusBannerProps) => {
  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed left-4 right-4 top-20 z-[140] mx-auto flex max-w-screen-md items-center gap-3 rounded-[18px] border border-rose-300/25 bg-rose-500/16 px-4 py-3 text-sm font-semibold text-rose-100 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:left-6 sm:right-6">
      <WifiOff size={17} className="flex-shrink-0 text-rose-200" />
      <span>No internet connection</span>
    </div>
  );
};
