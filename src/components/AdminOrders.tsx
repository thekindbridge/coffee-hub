import { useEffect, useMemo, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { db } from '../firebase';
import type { DeliveryAgent, DeliveryLocation, Order } from '../types';

const CURRENCY_SYMBOL = '\u20B9';

interface AdminOrdersProps {
  orders: Order[];
  newOrderDocIds: string[];
  orderStatuses: Order['status'][];
  deliveryAgents: DeliveryAgent[];
  onUpdateStatus: (orderDocId: string, status: Order['status']) => void;
}

const STATUS_BADGE_CLASS: Record<Order['status'], string> = {
  Pending: 'border border-amber-300/30 bg-amber-400/18 text-amber-300',
  Preparing: 'border border-sky-300/30 bg-sky-400/18 text-sky-300',
  'Out for Delivery': 'border border-orange-300/30 bg-orange-400/18 text-orange-300',
  Delivered: 'border border-emerald-300/30 bg-emerald-400/18 text-emerald-300',
};

const getTrackingOrderId = (order: Order, orderData?: Record<string, unknown>) =>
  (((orderData?.orderId as string) || order.id || order.doc_id).trim().toUpperCase());

const toSerializableLocation = (location: DeliveryLocation | null | undefined) => {
  if (!location) {
    return null;
  }

  return {
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy ?? null,
  };
};

const getInitialAgentLocation = (agentData: Record<string, unknown>, selectedAgent: DeliveryAgent) => {
  const lastLocationValue =
    agentData.lastLocation && typeof agentData.lastLocation === 'object'
      ? (agentData.lastLocation as Record<string, unknown>)
      : null;

  const fallbackLocation = selectedAgent.last_location;
  const lat = Number(lastLocationValue?.lat ?? fallbackLocation?.lat ?? 0);
  const lng = Number(lastLocationValue?.lng ?? fallbackLocation?.lng ?? 0);
  const accuracyValue = Number(lastLocationValue?.accuracy ?? fallbackLocation?.accuracy ?? Number.NaN);

  return {
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    accuracy: Number.isFinite(accuracyValue) ? accuracyValue : null,
  };
};

export default function AdminOrders({
  orders,
  newOrderDocIds,
  orderStatuses,
  deliveryAgents,
  onUpdateStatus,
}: AdminOrdersProps) {
  const [agentSelections, setAgentSelections] = useState<Record<string, string>>({});
  const [assigningOrderDocId, setAssigningOrderDocId] = useState('');
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, Order['status']>>({});
  const [toastMessage, setToastMessage] = useState('');

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

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('');
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  useEffect(() => {
    setOptimisticStatuses(previousStatuses => {
      const nextStatuses = { ...previousStatuses };

      orders.forEach(order => {
        if (nextStatuses[order.doc_id] && nextStatuses[order.doc_id] === order.status) {
          delete nextStatuses[order.doc_id];
        }
      });

      return nextStatuses;
    });
  }, [orders]);

  const assignAgentToOrder = async (orderDocId: string, agentId: string) => {
    if (!orderDocId) {
      alert('Order does not exist.');
      return;
    }

    if (!agentId) {
      alert('Select a delivery agent before dispatching the order.');
      return;
    }

    const selectedAgent = deliveryAgents.find(agent => agent.id === agentId);
    if (!selectedAgent) {
      alert('Selected delivery agent does not exist.');
      return;
    }

    if (!selectedAgent.is_active) {
      alert('Selected delivery agent is not active.');
      return;
    }

    const selectedOrder = orders.find(order => order.doc_id === orderDocId);
    if (!selectedOrder) {
      alert('Order does not exist.');
      return;
    }

    if (!selectedOrder.customer_location) {
      alert('Customer location is required before dispatching this order.');
      return;
    }

    setAssigningOrderDocId(orderDocId);

    try {
      await runTransaction(db, async transaction => {
        const orderRef = doc(db, 'orders', orderDocId);
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists()) {
          throw new Error('Order does not exist');
        }

        const orderData = orderSnap.data() as Record<string, unknown>;
        const trackingOrderId = getTrackingOrderId(selectedOrder, orderData);
        const agentRef = doc(db, 'delivery_agents', agentId);
        const sessionRef = doc(db, 'delivery_sessions', trackingOrderId);
        const locationRef = doc(db, 'agent_locations', trackingOrderId);
        const agentSnap = await transaction.get(agentRef);

        if (!agentSnap.exists()) {
          throw new Error('Selected delivery agent does not exist');
        }

        const agentData = agentSnap.data() as Record<string, unknown>;
        const isAgentActive = agentData.isActive === true;

        if (!isAgentActive) {
          throw new Error('Selected delivery agent is not active');
        }

        if ((orderData.status as string) === 'Delivered') {
          throw new Error('Delivered orders cannot be reassigned');
        }

        const previousAgentId =
          ((orderData.deliveryAgentId as string) || selectedOrder.delivery_agent_id || '').trim();
        const initialAgentLocation = getInitialAgentLocation(agentData, selectedAgent);

        transaction.update(orderRef, {
          agentId,
          deliveryAgentId: agentId,
          deliveryAgentName: (agentData.name as string) || selectedAgent.name,
          deliveryAgentPhone: (agentData.phone as string) || selectedAgent.phone || '',
          status: 'Out for Delivery',
          deliveryAssignedAt: serverTimestamp(),
        });

        transaction.set(
          agentRef,
          {
            currentOrderId: trackingOrderId,
            isActive: true,
            lastLocation: {
              lat: initialAgentLocation.lat,
              lng: initialAgentLocation.lng,
              accuracy: initialAgentLocation.accuracy,
              updatedAt: serverTimestamp(),
            },
            name: (agentData.name as string) || selectedAgent.name,
            phone: (agentData.phone as string) || selectedAgent.phone || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        if (previousAgentId && previousAgentId !== agentId) {
          transaction.set(
            doc(db, 'delivery_agents', previousAgentId),
            {
              currentOrderId: '',
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }

        transaction.set(
          sessionRef,
          {
            agentId,
            agentName: (agentData.name as string) || selectedAgent.name,
            completedAt: null,
            customerLocation:
              orderData.customerLocation ?? toSerializableLocation(selectedOrder.customer_location),
            orderDocId,
            orderId: trackingOrderId,
            startedAt: serverTimestamp(),
            status: 'active',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        transaction.set(
          locationRef,
          {
            agentId,
            lat: initialAgentLocation.lat,
            lng: initialAgentLocation.lng,
            accuracy: initialAgentLocation.accuracy,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });

      setOptimisticStatuses(previousStatuses => ({
        ...previousStatuses,
        [orderDocId]: 'Out for Delivery',
      }));
      setToastMessage('Agent assigned successfully');
    } catch (error) {
      console.error('Failed to assign delivery agent', error);
      alert('Unable to assign delivery agent. Please try again.');
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
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Orders queue</p>
        <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">Manage live orders</h2>
      </div>
      {toastMessage && (
        <div className="rounded-[20px] border border-emerald-300/20 bg-emerald-500/12 px-4 py-3 text-sm font-semibold text-emerald-300">
          {toastMessage}
        </div>
      )}

      {sortedOrders.map(order => {
        const effectiveStatus = optimisticStatuses[order.doc_id] || order.status;
        const isAssigned = effectiveStatus === 'Out for Delivery' || effectiveStatus === 'Delivered';

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
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASS[effectiveStatus]}`}>
                {effectiveStatus}
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
                    setAgentSelections(previousSelections => ({
                      ...previousSelections,
                      [order.doc_id]: event.target.value,
                    }));
                  }}
                  className="coffee-input"
                >
                  <option value="">Select agent</option>
                  {deliveryAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}{agent.phone ? ` - ${agent.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  void assignAgentToOrder(order.doc_id, agentSelections[order.doc_id] || '');
                }}
                disabled={!agentSelections[order.doc_id] || isAssigned || assigningOrderDocId === order.doc_id}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assigningOrderDocId === order.doc_id ? 'Dispatching...' : 'Assign & Dispatch'}
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
                value={effectiveStatus}
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
        );
      })}
    </section>
  );
}
