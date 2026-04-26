import { Bell, Check, X } from 'lucide-react';
import type { AppNotification } from '../../types';

type NotificationHistoryPageProps = {
  error: string;
  isLoading: boolean;
  isMarkingId: string;
  isOpen: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
};

const formatNotificationTime = (value: string) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
};

export const NotificationHistoryPage = ({
  error,
  isLoading,
  isMarkingId,
  isOpen,
  notifications,
  onClose,
  onMarkAsRead,
}: NotificationHistoryPageProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[96] bg-black/70 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-screen-md flex-col bg-[#120d0b] px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8b6145,#4e3427)]">
              <Bell className="text-accent" size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                Notifications
              </p>
              <p className="mt-1 text-sm font-semibold text-accent">
                Recent updates
              </p>
            </div>
          </div>

          <button onClick={onClose} className="coffee-icon-btn" aria-label="Close notifications">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-6 text-sm text-ink-muted">
              Loading notifications...
            </div>
          ) : error ? (
            <div className="rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-6 text-sm font-semibold text-primary">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-6 text-sm text-ink-muted">
              No notifications yet.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <article
                  key={notification.id}
                  className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-accent">
                        {notification.title || 'Coffee Hub'}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        {notification.body}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-secondary/80">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>

                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(notification.id)}
                        disabled={isMarkingId === notification.id}
                        className="coffee-btn-secondary shrink-0"
                      >
                        <Check size={16} />
                        {isMarkingId === notification.id ? 'Saving...' : 'Mark Read'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
