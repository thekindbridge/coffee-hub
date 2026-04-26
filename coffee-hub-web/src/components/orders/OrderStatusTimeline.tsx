import {
  getOrderStatusCustomerCopy,
  getOrderStatusLabel,
  getStepIndex,
  isTerminalOrderStatus,
  normalizeStatus,
  type OrderStatusCode,
} from '../../../shared/orderStatus';

const STATUS_FLOW: OrderStatusCode[] = [
  'WAITING',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const STATUS_STEP_LABEL: Record<OrderStatusCode, string> = {
  WAITING: 'WAITING',
  PREPARING: 'PREPARING',
  OUT_FOR_DELIVERY: 'OUT FOR DELIVERY',
  DELIVERED: 'DELIVERED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

type OrderStatusTimelineProps = {
  statusCode: OrderStatusCode | string;
  className?: string;
  compact?: boolean;
  subtext?: string;
};

const joinClassNames = (...classNames: Array<string | false | null | undefined>) =>
  classNames.filter(Boolean).join(' ');

export const OrderStatusTimeline = ({
  statusCode,
  className,
  compact = false,
  subtext,
}: OrderStatusTimelineProps) => {
  const currentStatus = normalizeStatus(statusCode);
  const statusLabel = getOrderStatusLabel(currentStatus);
  const statusSubtext = subtext ?? getOrderStatusCustomerCopy(currentStatus);
  const currentStepIndex = getStepIndex(currentStatus);
  const progressPercent = currentStepIndex <= 0
    ? 0
    : (currentStepIndex / (STATUS_FLOW.length - 1)) * 100;
  const isTerminal = isTerminalOrderStatus(currentStatus);

  return (
    <div className={joinClassNames(
      'rounded-[24px] border border-white/10 bg-white/5',
      compact ? 'px-4 py-4' : 'px-5 py-5',
      className,
    )}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={joinClassNames(
            'font-semibold uppercase tracking-[0.24em] text-secondary',
            compact ? 'text-[10px]' : 'text-[11px]',
          )}>
            Status
          </p>
          <h3 className={joinClassNames(
            'mt-2 font-semibold text-accent',
            compact ? 'text-lg' : 'text-[1.7rem]',
          )}>
            {statusLabel}
          </h3>
          <p className={joinClassNames(
            'mt-2 text-ink-muted',
            compact ? 'text-sm leading-6' : 'text-sm',
          )}>
            {statusSubtext}
          </p>
        </div>
        <span className={joinClassNames(
          'rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]',
          currentStatus === 'DELIVERED'
            ? 'border-emerald-400/30 bg-emerald-400/14 text-emerald-300'
            : currentStatus === 'REJECTED' || currentStatus === 'CANCELLED'
              ? 'border-rose-400/30 bg-rose-500/14 text-rose-200'
              : currentStatus === 'OUT_FOR_DELIVERY'
                ? 'border-sky-400/30 bg-sky-400/14 text-sky-300'
                : currentStatus === 'PREPARING'
                  ? 'border-amber-400/30 bg-amber-400/14 text-amber-300'
                  : 'border-[#d7b26d]/35 bg-[#d7b26d]/12 text-[#f4d58e]',
        )}>
          {STATUS_STEP_LABEL[currentStatus]}
        </span>
      </div>

      {!isTerminal && (
        <div className="mt-5">
          <div className="relative">
            <div className="absolute left-0 right-0 top-3 h-1.5 rounded-full bg-white/10" />
            <div
              className="absolute left-0 top-3 h-1.5 rounded-full bg-[#d7b26d] transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
            <div className="grid grid-cols-4 gap-2">
              {STATUS_FLOW.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step} className="flex min-w-0 flex-col items-center gap-2 text-center">
                    <div
                      aria-current={isCurrent ? 'step' : undefined}
                      className={joinClassNames(
                        'h-3 w-3 rounded-full border transition-all',
                        isCompleted
                          ? 'border-emerald-300 bg-emerald-300 shadow-[0_0_0_3px_rgba(52,211,153,0.16)]'
                          : isCurrent
                            ? 'border-[#f4d58e] bg-[#f4d58e] shadow-[0_0_18px_rgba(244,213,142,0.45)]'
                            : 'border-white/15 bg-[#1a1310]',
                      )}
                    />
                    <span
                      className={joinClassNames(
                        'text-[9px] font-semibold uppercase leading-4 sm:text-[10px]',
                        isCompleted
                          ? 'text-emerald-200'
                          : isCurrent
                            ? 'text-accent'
                            : 'text-ink-muted',
                      )}
                    >
                      {STATUS_STEP_LABEL[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusTimeline;
