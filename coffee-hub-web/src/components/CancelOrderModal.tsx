import { useEffect, useMemo, useState } from 'react';

const CANCELLATION_REASONS = [
  'Ordered by mistake',
  'Change of plans',
  'Taking too long',
  'Other',
] as const;

type CancelOrderModalProps = {
  isOpen: boolean;
  orderId: string;
  isSubmitting: boolean;
  submitError: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

export const CancelOrderModal = ({
  isOpen,
  orderId,
  isSubmitting,
  submitError,
  onClose,
  onConfirm,
}: CancelOrderModalProps) => {
  const [selectedReason, setSelectedReason] =
    useState<(typeof CANCELLATION_REASONS)[number]>('Ordered by mistake');
  const [otherReason, setOtherReason] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedReason('Ordered by mistake');
    setOtherReason('');
    setValidationError('');
  }, [isOpen]);

  const resolvedReason = useMemo(() => (
    selectedReason === 'Other' ? otherReason.trim() : selectedReason
  ), [otherReason, selectedReason]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    if (!resolvedReason) {
      setValidationError('Please select a reason before continuing.');
      return;
    }

    setValidationError('');
    await onConfirm(resolvedReason);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 px-4 py-6 sm:items-center sm:px-6">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#16100c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Cancel Order</p>
        <h3 className="mt-2 text-[1.35rem] font-semibold text-accent">
          Cancel order #{orderId}
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Are you sure you want to cancel this order? This keeps the kitchen and delivery flow accurate.
        </p>

        <div className="mt-5 space-y-3">
          {CANCELLATION_REASONS.map(reason => {
            const isSelected = selectedReason === reason;

            return (
              <button
                key={reason}
                type="button"
                onClick={() => {
                  setSelectedReason(reason);
                  if (validationError) {
                    setValidationError('');
                  }
                }}
                className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm transition ${
                  isSelected
                    ? 'border-rose-300/35 bg-rose-500/12 text-rose-100'
                    : 'border-white/8 bg-white/5 text-ink-muted hover:border-white/14 hover:text-ink'
                }`}
              >
                <span>{reason}</span>
                <span
                  className={`h-4 w-4 rounded-full border ${
                    isSelected ? 'border-rose-300 bg-rose-300' : 'border-white/20'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {selectedReason === 'Other' && (
          <div className="mt-4">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              Tell us more
            </label>
            <textarea
              value={otherReason}
              onChange={event => {
                setOtherReason(event.target.value);
                if (validationError) {
                  setValidationError('');
                }
              }}
              rows={4}
              maxLength={160}
              placeholder="Write your reason here."
              className="coffee-input mt-2 min-h-[120px] resize-none"
            />
          </div>
        )}

        {(validationError || submitError) && (
          <p className="mt-4 text-sm font-semibold text-rose-300">
            {validationError || submitError}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="coffee-btn-secondary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isSubmitting}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
