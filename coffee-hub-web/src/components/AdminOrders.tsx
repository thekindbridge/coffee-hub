import { useEffect, useMemo, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { db } from '../firebase';
import type { DeliveryAgent, DeliveryLocation, Order } from '../types';
import { calculateDistanceMeters } from '../agent/agentTracker';

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
  orderStatuses,
  deliveryAgents,
  onUpdateStatus,
}: AdminOrdersProps) {
  const [expandedOrderId, setExpandedOrderId] = useState('');
  const [assigningOrderDocId, setAssigningOrderDocId] = useState('');
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, Order['status']>>({});
  const [toastMessage, setToastMessage] = useState('');

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders],
  );

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

    const selectedAgentStatus = getAgentStatus(selectedAgent);
    if (!selectedAgent.is_active || selectedAgentStatus === 'offline' || selectedAgentStatus === 'busy') {
      alert('Selected delivery agent is not available.');
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
        const agentStatusValue = typeof agentData.status === 'string' ? agentData.status.toLowerCase() : '';
        const isAgentActive = agentData.isActive === true || (agentStatusValue ? agentStatusValue !== 'offline' : false);

        if (!isAgentActive || agentStatusValue === 'busy') {
          throw new Error('Selected delivery agent is not available');
        }

        if ((orderData.status as string) === 'Delivered') {
          throw new Error('Delivered orders cannot be reassigned');
        }

        const previousAgentId =
          ((orderData.deliveryAgentId as string) || selectedOrder.delivery_agent_id || '').trim();
        const agentName = (agentData.name as string) || selectedAgent.name;
        const agentPhone = (agentData.phone as string) || selectedAgent.phone || '';
        const agentEmail = (agentData.email as string) || selectedAgent.email || '';
        const agentVehicle = (agentData.vehicleType as string) || selectedAgent.vehicle_type || '';

        transaction.update(orderRef, {
          agentId,
          agentName,
          agentPhone,
          agentEmail,
          agentVehicle,
          deliveryAgentId: agentId,
          deliveryAgentName: agentName,
          deliveryAgentPhone: agentPhone,
          deliveryAgentEmail: agentEmail,
          deliveryAgentVehicle: agentVehicle,
          status: 'Out for Delivery',
          assignedAt: serverTimestamp(),
          deliveryAssignedAt: serverTimestamp(),
          outForDeliveryAt: serverTimestamp(),
          deliveryOutForDeliveryAt: serverTimestamp(),
        });

        transaction.set(
          agentRef,
          {
            currentOrderId: trackingOrderId,
            isActive: true,
            name: agentName,
            phone: agentPhone,
            email: agentEmail,
            status: 'busy',
            vehicleType: agentVehicle,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        if (previousAgentId && previousAgentId !== agentId) {
          transaction.set(
            doc(db, 'delivery_agents', previousAgentId),
            {
              currentOrderId: '',
              status: 'available',
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }

        transaction.set(
          sessionRef,
          {
            agentId,
            agentName,
            agentPhone,
            completedAt: null,
            customerLocation:
              orderData.customerLocation ?? toSerializableLocation(selectedOrder.customer_location),
            lastLocation: null,
            orderDocId,
            orderId: trackingOrderId,
            startedAt: null,
            status: 'assigned',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        transaction.delete(locationRef);
      });

      setOptimisticStatuses(previousStatuses => ({
        ...previousStatuses,
        [orderDocId]: 'Out for Delivery',
      }));
      setToastMessage('Agent assigned successfully');
      setExpandedOrderId('');
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
        const isExpanded = expandedOrderId === order.doc_id;
        const assignedAgentProfile = order.delivery_agent_id
          ? deliveryAgents.find(agent => agent.id === order.delivery_agent_id) || null
          : null;
        const assignedAgentName = assignedAgentProfile?.name || order.delivery_agent_name || 'Agent not assigned';
        const assignedAgentPhone = assignedAgentProfile?.phone || order.delivery_agent_phone || '--';
        const assignedAgentVehicle = assignedAgentProfile?.vehicle_type || order.delivery_agent_vehicle || '--';
        const assignedAgentStatus = assignedAgentProfile
          ? formatAgentStatusLabel(getAgentStatus(assignedAgentProfile))
          : effectiveStatus === 'Out for Delivery'
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

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  Assign Agent
                </p>
                <button
                  onClick={() => {
                    if (isAssigned) {
                      return;
                    }
                    setExpandedOrderId(prev => (prev === order.doc_id ? '' : order.doc_id));
                  }}
                  disabled={isAssigned}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAssigned ? 'Assigned' : isExpanded ? 'Hide Agents' : 'Assign Agent'}
                </button>
              </div>

              {isExpanded && !isAssigned && (
                <div className="space-y-2">
                  {deliveryAgents.length === 0 ? (
                    <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-ink-muted">
                      No delivery agents available.
                    </div>
                  ) : (
                    deliveryAgents.map(agent => {
                      const statusValue = getAgentStatus(agent);
                      const statusLabel = formatAgentStatusLabel(statusValue);
                      const isAgentUnavailable = statusValue === 'offline' || statusValue === 'busy';
                      return (
                        <div
                          key={agent.id}
                          className="grid gap-3 rounded-[18px] border border-white/8 bg-white/5 p-4 sm:grid-cols-[1.3fr,0.7fr,auto] sm:items-center"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-accent">{agent.name}</p>
                            <p className="text-sm text-ink-muted">
                              {agent.vehicle_type || 'Vehicle not added'}
                            </p>
                            <p className="text-sm text-ink-muted">
                              {agent.phone || 'Phone not added'}
                            </p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                              {statusLabel}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                              Distance
                            </p>
                            <p className="mt-1 text-sm font-semibold text-ink">{resolveAgentDistance(agent, order)}</p>
                          </div>
                          <button
                            onClick={() => {
                              void assignAgentToOrder(order.doc_id, agent.id);
                            }}
                            disabled={isAgentUnavailable || assigningOrderDocId === order.doc_id}
                            className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {assigningOrderDocId === order.doc_id ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {(order.delivery_agent_id || order.delivery_agent_name || order.delivery_agent_phone || order.delivery_agent_vehicle) && (
              <div className="mt-3 space-y-3 rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-ink-muted">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">Assigned Agent</p>
                </div>
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
