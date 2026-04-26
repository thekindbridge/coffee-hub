import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  getOrderStatusCustomerCopy,
  normalizeOrderStatusCode,
  type OrderStatusCode,
} from '../../../../shared/orderStatus';
import { OrderStatusTimeline } from '../../../components/orders/OrderStatusTimeline';
import type { DeliveryAgent, Order } from '../../../types';
import { calculateDistanceMeters } from '../../../agent/agentTracker';
import { Loader } from '../../../components/ui/Loader';

const AdminDeliveryMonitor = lazy(() => import('./AdminDeliveryMonitor'));

const CURRENCY_SYMBOL = '\u20B9';

interface AdminOrdersProps {
  orders: Order[];
  newOrderDocIds: string[];
  deliveryAgents: DeliveryAgent[];
  onUpdateStatus: (params: {
    orderId: string;
    status: OrderStatusCode;
    rejectionReason?: string;
  }) => Promise<void>;
  onAssignAgent: (orderDocId: string, agentId: string) => Promise<void>;
}

const STATUS_BADGE_CLASS: Record<Order['status'], string> = {
  Pending: 'border border-amber-300/30 bg-amber-400/18 text-amber-300',
  Preparing: 'border border-sky-300/30 bg-sky-400/18 text-sky-300',
  'Out for Delivery': 'border border-orange-300/30 bg-orange-400/18 text-orange-300',
  Delivered: 'border border-emerald-300/30 bg-emerald-500/18 text-emerald-200',
  Rejected: 'border border-rose-300/30 bg-rose-400/18 text-rose-300',
  Cancelled: 'border border-rose-300/30 bg-rose-500/18 text-rose-200',
};

const formatDistance = (meters: number | null) => {
  if (meters === null || !Number.isFinite(meters)) {
    return '--';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
};

const resolveAgentDistance = (agent: DeliveryAgent, order: Order) => {
  const agentLocation = agent.current_location ?? agent.last_location;
  if (!agentLocation || !order.customer_location) {
    return '--';
  }

  const meters = calculateDistanceMeters(agentLocation, order.customer_location);
  return formatDistance(meters);
};

const getAgentStatus = (agent: DeliveryAgent) => (
  agent.status ?? (agent.is_active ? 'available' : 'offline')
);

const formatAgentStatusLabel = (status: DeliveryAgent['status'] | 'available' | 'offline' | 'busy') => (
  `${status.charAt(0).toUpperCase()}${status.slice(1)}`
);

export default function AdminOrders({
  orders,
  newOrderDocIds,
  deliveryAgents,
  onUpdateStatus,
  onAssignAgent,
}: AdminOrdersProps) {
  const [expandedOrderId, setExpandedOrderId] = useState('');
  const [assigningOrderDocId, setAssigningOrderDocId] = useState('');
  const [submittingOrderDocId, setSubmittingOrderDocId] = useState('');
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState('');
  const [actionError, setActionError] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [selectedAgentByOrderDocId, setSelectedAgentByOrderDocId] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState('');

  const availableAgents = useMemo(
    () => deliveryAgents.filter(agent => getAgentStatus(agent) === 'available'),
    [deliveryAgents],
  );

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders],
  );

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setToastMessage('');
    }, 2600);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const closeRejectModal = () => {
    setRejectingOrder(null);
    setRejectionReasonDraft('');
    setRejectError('');
  };

  const runStatusAction = async (
    order: Order,
    status: OrderStatusCode,
    rejectionReason?: string,
  ) => {
    setActionError('');
    setSubmittingOrderDocId(order.doc_id);

    try {
      await onUpdateStatus({
        orderId: order.doc_id,
        status,
        rejectionReason,
      });

      if (status === 'REJECTED') {
        setToastMessage('Order rejected successfully');
      } else {
        setToastMessage(`Order moved to ${normalizeOrderStatusCode(status)}`);
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unable to update this order right now.';
      setActionError(message);
      throw error;
    } finally {
      setSubmittingOrderDocId('');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingOrder) {
      return;
    }

    const nextReason = rejectionReasonDraft.trim();
    if (!nextReason) {
      setRejectError('Enter a rejection reason before confirming.');
      return;
    }

    try {
      await runStatusAction(rejectingOrder, 'REJECTED', nextReason);
      closeRejectModal();
    } catch {
      // Error already surfaced in the modal / alert area.
    }
  };

  const assignAgentToOrder = async (order: Order, agentId: string) => {
    if (!agentId) {
      setActionError('Select a delivery agent before dispatching the order.');
      return;
    }

    if (order.status_code !== 'PREPARING') {
      setActionError('Only preparing orders can be assigned to a delivery agent.');
      return;
    }

    const selectedAgent = availableAgents.find(agent => agent.id === agentId);
    if (!selectedAgent) {
      setActionError('Selected delivery agent is not available.');
      return;
    }

    setActionError('');
    setAssigningOrderDocId(order.doc_id);

    try {
      await onAssignAgent(order.doc_id, selectedAgent.id);

      setToastMessage('Delivery agent assigned');
      setExpandedOrderId('');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unable to assign delivery agent.';
      setActionError(message);
    } finally {
      setAssigningOrderDocId('');
    }
  };

  if (sortedOrders.length === 0) {
    return (
      <div className="coffee-surface-soft rounded-[24px] p-6 text-center text-sm text-ink-muted">
        No orders yet.
      </div>
    );
  }

  return (
    <>
      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Orders queue</p>
          <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">Manage live orders</h2>
        </div>

        {actionError && (
          <div className="rounded-[20px] border border-rose-300/20 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-300">
            {actionError}
          </div>
        )}

        {toastMessage && (
          <div className="rounded-[20px] border border-emerald-300/20 bg-emerald-500/12 px-4 py-3 text-sm font-semibold text-emerald-300">
            {toastMessage}
          </div>
        )}

        {sortedOrders.map(order => {
          const canManageAgentAssignment = order.status_code === 'PREPARING';
          const isExpanded = expandedOrderId === order.doc_id;
          const hasAssignedAgent = Boolean(
            order.delivery_agent_id ||
            order.delivery_agent_name ||
            order.delivery_agent_phone ||
            order.delivery_agent_vehicle,
          );
          const assignedAgentProfile = order.delivery_agent_id
            ? deliveryAgents.find(agent => agent.id === order.delivery_agent_id) || null
            : null;
          const assignedAgentName = assignedAgentProfile?.name || order.delivery_agent_name || 'Agent not assigned';
          const assignedAgentPhone = assignedAgentProfile?.phone || order.delivery_agent_phone || '--';
          const assignedAgentVehicle = assignedAgentProfile?.vehicle_type || order.delivery_agent_vehicle || '--';
          const assignedAgentStatus = assignedAgentProfile
            ? formatAgentStatusLabel(getAgentStatus(assignedAgentProfile))
            : order.status_code === 'OUT_FOR_DELIVERY'
              ? 'Busy'
              : '--';

          return (
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

              <p className="mt-3 text-sm text-ink-muted">{getOrderStatusCustomerCopy(order.status_code)}</p>
              <div className="mt-4">
                <OrderStatusTimeline compact statusCode={order.status_code} />
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

              <div className="mt-4 text-sm text-ink-muted">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Items</p>
                {order.items && order.items.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {order.items.map(item => (
                      <li key={item.id}>
                        {item.name} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">Items loading...</p>
                )}
              </div>

              {order.status_code === 'REJECTED' && order.rejection_reason && (
                <div className="mt-4 rounded-[18px] border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">Rejection reason</p>
                  <p className="mt-2 leading-6">{order.rejection_reason}</p>
                </div>
              )}

              {order.status_code === 'CANCELLED' && order.cancellation_reason && (
                <div className="mt-4 rounded-[18px] border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">Cancellation reason</p>
                  <p className="mt-2 leading-6">{order.cancellation_reason}</p>
                </div>
              )}

              {hasAssignedAgent && (
                <div className="mt-4 space-y-3 rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-ink-muted">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">Assigned Agent</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Name</p>
                      <p className="mt-1 text-sm font-semibold text-accent">{assignedAgentName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Phone</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{assignedAgentPhone}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Vehicle</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{assignedAgentVehicle}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Status</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{assignedAgentStatus}</p>
                    </div>
                  </div>
                </div>
              )}

              {order.status_code === 'OUT_FOR_DELIVERY' && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                      Live Monitor
                    </p>
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(prev => (prev === order.doc_id ? '' : order.doc_id))}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:opacity-90"
                    >
                      {isExpanded ? 'Hide Monitor' : 'Open Monitor'}
                    </button>
                  </div>

                  {isExpanded && (
                    <Suspense fallback={<Loader label="Loading live monitor..." minHeightClassName="min-h-[260px]" />}>
                      <AdminDeliveryMonitor order={order} />
                    </Suspense>
                  )}
                </div>
              )}

              {canManageAgentAssignment && (
                <div className="mt-4 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                    Assign Agent
                  </p>
                  {availableAgents.length === 0 ? (
                    <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-ink-muted">
                      No active delivery agents available.
                    </div>
                  ) : (
                    <div className="grid gap-3 rounded-[18px] border border-white/8 bg-white/5 p-4 sm:grid-cols-[1.4fr,0.8fr,auto] sm:items-end">
                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                          Active agents
                        </span>
                        <select
                          value={selectedAgentByOrderDocId[order.doc_id] || order.delivery_agent_id || ''}
                          onChange={event => {
                            const nextAgentId = event.target.value;
                            setSelectedAgentByOrderDocId(prev => ({
                              ...prev,
                              [order.doc_id]: nextAgentId,
                            }));
                          }}
                          className="coffee-input min-h-11"
                        >
                          <option value="">Select agent</option>
                          {availableAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} · {formatAgentStatusLabel(getAgentStatus(agent))} · {resolveAgentDistance(agent, order)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="rounded-[16px] border border-white/8 bg-[#17110d] px-4 py-3 text-sm text-ink-muted">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                          Assigned
                        </p>
                        <p className="mt-1 font-semibold text-accent">{assignedAgentName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void assignAgentToOrder(
                            order,
                            selectedAgentByOrderDocId[order.doc_id] || order.delivery_agent_id || '',
                          );
                        }}
                        disabled={assigningOrderDocId === order.doc_id}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {assigningOrderDocId === order.doc_id ? 'Saving...' : hasAssignedAgent ? 'Update Agent' : 'Assign Agent'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-[20px] border border-white/8 bg-white/5 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Actions</p>

                {order.status_code === 'WAITING' && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void runStatusAction(order, 'PREPARING');
                      }}
                      disabled={submittingOrderDocId === order.doc_id}
                      className="coffee-btn-primary min-h-10 px-4"
                    >
                      {submittingOrderDocId === order.doc_id ? 'Updating...' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError('');
                        setRejectingOrder(order);
                        setRejectionReasonDraft('');
                        setRejectError('');
                      }}
                      disabled={submittingOrderDocId === order.doc_id}
                      className="rounded-full border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/16 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {order.status_code === 'PREPARING' && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void runStatusAction(order, 'OUT_FOR_DELIVERY');
                      }}
                      disabled={submittingOrderDocId === order.doc_id || !order.delivery_agent_id}
                      className="coffee-btn-primary min-h-10 px-4 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingOrderDocId === order.doc_id ? 'Dispatching...' : 'Dispatch'}
                    </button>
                    {!order.delivery_agent_id && (
                      <p className="self-center text-sm text-ink-muted">
                        Assign an active agent before dispatch.
                      </p>
                    )}
                  </div>
                )}

                {order.status_code === 'OUT_FOR_DELIVERY' && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        void runStatusAction(order, 'DELIVERED');
                      }}
                      disabled={submittingOrderDocId === order.doc_id}
                      className="coffee-btn-primary min-h-10 px-4"
                    >
                      {submittingOrderDocId === order.doc_id ? 'Updating...' : 'Mark Delivered'}
                    </button>
                  </div>
                )}

                {(
                  order.status_code === 'DELIVERED' ||
                  order.status_code === 'REJECTED' ||
                  order.status_code === 'CANCELLED'
                ) && (
                  <p className="mt-3 text-sm text-ink-muted">
                    This order is locked because it has reached a final state.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {rejectingOrder && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 px-4 py-6 sm:items-center sm:px-6">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#16100c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Reject Order</p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-accent">
              Reject order #{rejectingOrder.id}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Enter a clear reason. The customer will see this comment in their live order updates.
            </p>

            <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              Enter rejection reason
            </label>
            <textarea
              value={rejectionReasonDraft}
              onChange={event => {
                setRejectionReasonDraft(event.target.value);
                if (rejectError) {
                  setRejectError('');
                }
              }}
              rows={4}
              placeholder="Example: Shop is closed for maintenance."
              className="coffee-input mt-2 min-h-[120px] resize-none"
            />

            {rejectError && (
              <p className="mt-3 text-sm font-semibold text-rose-300">{rejectError}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeRejectModal}
                className="coffee-btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleRejectConfirm();
                }}
                disabled={submittingOrderDocId === rejectingOrder.doc_id}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingOrderDocId === rejectingOrder.doc_id ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
