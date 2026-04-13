import type { DeliveryEarningsSummary } from '../utils/orderHelpers';
import { formatDateTime } from '../utils/formatTime';
import { formatCurrencyAmount } from '../utils/orderHelpers';

interface EarningsSummaryProps {
  summary: DeliveryEarningsSummary;
}

const summaryCards = (summary: DeliveryEarningsSummary) => ([
  {
    label: 'Delivered Orders',
    value: String(summary.completedCount),
  },
  {
    label: 'Total Earnings',
    value: formatCurrencyAmount(summary.totalAmount),
  },
  {
    label: 'Average Ticket',
    value: formatCurrencyAmount(summary.averageOrderValue),
  },
  {
    label: 'Last Delivery',
    value: formatDateTime(summary.lastDeliveredAt, 'No deliveries yet'),
  },
]);

export const EarningsSummary = ({ summary }: EarningsSummaryProps) => (
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {summaryCards(summary).map(card => (
      <article
        key={card.label}
        className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
          {card.label}
        </p>
        <p className="mt-3 text-xl font-black text-ink">{card.value}</p>
      </article>
    ))}
  </section>
);
