import { useEffect, useMemo, useState } from 'react';
import type { DeliveryAgent, Order } from '../types';

const CURRENCY_SYMBOL = '\u20B9';

interface AdminOrdersProps {
  orders: Order[];
  newOrderDocIds: string[];
  orderStatuses: Order['status'][];
  deliveryAgents: DeliveryAgent[];
  onUpdateStatus: (orderDocId: string, status: Order['status']) => void;
  onAssignAgent: (order: Order, agentId: string) => void;
}

const STATUS_BADGE_CLASS: Record<Order['status'], string> = {
  Pending: 'border border-amber-300/30 bg-amber-400/18 text-amber-300',
  Preparing: 'border border-sky-300/30 bg-sky-400/18 text-sky-300',
  'Out for Delivery': 'border border-orange-300/30 bg-orange-400/18 text-orange-300',
  Delivered: 'border border-emerald-300/30 bg-emerald-400/18 text-emerald-300',
};

export default function AdminOrders({
  orders,
  newOrderDocIds,
  orderStatuses,
  deliveryAgents,
  onUpdateStatus,
  onAssignAgent,
}: AdminOrdersProps) {
  const [agentSelections, setAgentSelections] = useState<Record<string, string>>({});

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders],
  );

  useEffect(() => {
    setAgentSelections(previousSelections => {
      const nextSelections = { ...previousSelections };

      orders.forEach(order => {
        if (nextSelections[order.doc_id]) {
          return;
        }

        nextSelections[order.doc_id] = order.delivery_agent_id || deliveryAgents[0]?.id || '';
      });

      return nextSelections;
    });
  }, [deliveryAgents, orders]);

  if (sortedOrders.length === 0) {
    return (
      <div className="coffee-surface-soft rounded-[24px] p-6 text-center text-sm text-ink-muted">
        No orders yet.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Orders queue</p>
        <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">Manage live orders</h2>
      </div>

      {sortedOrders.map(order => (
        <article
          key={order.doc_id}
          className={`coffee-surface-soft rounded-[24px] p-4 ${
            newOrderDocIds.includes(order.doc_id) ? 'ring-1 ring-secondary/40' : ''
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Order ID</p>
              <p className="mt-1 text-lg font-semibold text-accent">#{order.id}</p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASS[order.status]}`}>
              {order.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Customer</p>
              <p className="mt-1 font-semibold text-accent">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Total</p>
              <p className="mt-1 font-semibold text-highlight">{CURRENCY_SYMBOL}{order.total_amount}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Assign Delivery Agent
              </label>
              <select
                value={agentSelections[order.doc_id] || ''}
                onChange={event => {
                  setAgentSelections(prev => ({
                    ...prev,
                    [order.doc_id]: event.target.value,
                  }));
                }}
                className="coffee-input"
              >
                <option value="">Select agent</option>
                {deliveryAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}{agent.phone ? ` • ${agent.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => onAssignAgent(order, agentSelections[order.doc_id] || '')}
              disabled={!agentSelections[order.doc_id] || order.status === 'Delivered'}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Assign & Dispatch
            </button>
          </div>

          {(order.delivery_agent_name || order.delivery_agent_phone) && (
            <div className="mt-3 rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-ink-muted">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">Assigned rider</p>
              <p className="mt-1 font-semibold text-accent">
                {order.delivery_agent_name || 'Delivery Partner'}
              </p>
              {order.delivery_agent_phone && <p className="mt-1">{order.delivery_agent_phone}</p>}
            </div>
          )}

          <div className="mt-4">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              Change Status
            </label>
            <select
              value={order.status}
              onChange={event => onUpdateStatus(order.doc_id, event.target.value as Order['status'])}
              className="coffee-input"
            >
              {orderStatuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </article>
      ))}
    </section>
  );
}
