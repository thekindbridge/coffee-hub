type ProfileCompletionPromptProps = {
  error: string;
  isOpen: boolean;
  isSavingPreference: boolean;
  onCompleteProfile: () => void;
  onDisableReminder: () => void;
  onRemindLater: () => void;
};

export const ProfileCompletionPrompt = ({
  error,
  isOpen,
  isSavingPreference,
  onCompleteProfile,
  onDisableReminder,
  onRemindLater,
}: ProfileCompletionPromptProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/65 px-4 pb-6 pt-10 backdrop-blur-sm sm:items-center sm:pb-10">
      <div className="coffee-surface w-full max-w-md rounded-[28px] p-5 shadow-[0_30px_70px_rgba(0,0,0,0.4)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-secondary">
          Faster Checkout
        </p>
        <h2 className="mt-2 text-[1.45rem] font-semibold text-accent">
          Complete your profile for faster checkout
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Add your name and delivery address once so your next order is ready with fewer taps.
        </p>

        {error && (
          <div className="mt-4 rounded-[20px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={onCompleteProfile}
            className="coffee-btn-primary w-full justify-center"
          >
            Complete Profile
          </button>
          <button
            type="button"
            onClick={onRemindLater}
            className="coffee-btn-secondary w-full justify-center"
          >
            Remind Me Later
          </button>
          <button
            type="button"
            onClick={onDisableReminder}
            disabled={isSavingPreference}
            className="coffee-btn-secondary w-full justify-center disabled:opacity-70"
          >
            {isSavingPreference ? 'Saving preference...' : "Don't Ask Again"}
          </button>
        </div>
      </div>
    </div>
  );
};
