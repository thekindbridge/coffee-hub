import { AnimatePresence, motion } from 'motion/react';
import { BellRing, ExternalLink, X } from 'lucide-react';

type ForegroundNotificationToastProps = {
  notification: {
    title: string;
    body: string;
    url: string;
  } | null;
  onDismiss: () => void;
};

export const ForegroundNotificationToast = ({
  notification,
  onDismiss,
}: ForegroundNotificationToastProps) => (
  <AnimatePresence>
    {notification && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="coffee-surface fixed inset-x-4 bottom-24 z-[95] mx-auto w-auto max-w-md p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
      >
        <div className="flex items-start gap-3">
          <div className="app-muted-panel flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-secondary">
            <BellRing size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-accent">{notification.title}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{notification.body}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="coffee-icon-btn h-9 w-9 rounded-full p-0"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>

        {notification.url && (
          <a
            href={notification.url}
            className="coffee-btn-secondary mt-4 w-full justify-center"
          >
            <ExternalLink size={16} />
            Open
          </a>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);
