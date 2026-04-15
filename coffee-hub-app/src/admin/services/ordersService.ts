import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { mapAgentRecordToAgent } from '../../delivery-agent/lib/firestoreMappers';
import {
  subscribeToAdminOrders,
  subscribeToKitchenOrders,
  subscribeToPendingOrders,
} from '../../services/firebase/ordersRealtimeService';
import { getFirebaseDb } from '../../services/firebase';
import { AppServiceError, toAppServiceError } from '../../services/serviceError';
import {
  getOrderStatusFirestoreValue,
  isTerminalOrderStatus,
  isValidOrderStatusTransition,
  normalizeOrderStatusCode,
  requiresRejectionReason,
  type OrderStatusCode,
} from '../../shared/orderStatus';
import { sanitizeFirestoreData } from '../../utils/sanitizeFirestoreData';
import type { DeliveryAgent, Order } from '../types';

const ORDERS_COLLECTION = 'orders';
const AGENTS_COLLECTION = 'agents';
const DELIVERY_SESSIONS_COLLECTION = 'delivery_sessions';

export type DeliveryAgentAssignment = Pick<
  DeliveryAgent,
  'email' | 'id' | 'name' | 'phone' | 'vehicle_type'
>;

export {
  subscribeToAdminOrders,
  subscribeToKitchenOrders,
  subscribeToPendingOrders,
};

const isAvailableAgentStatus = (value?: string | null) => {
  const normalizedValue = value?.trim().toLowerCase() || '';
  return normalizedValue === 'active' || normalizedValue === 'available';
};

export const subscribeToAvailableDeliveryAgents = (
  onData: (agents: DeliveryAgent[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(getFirebaseDb(), AGENTS_COLLECTION),
  snapshot => {
    const agents = snapshot.docs
      .filter(docSnapshot => {
        const data = docSnapshot.data() as Record<string, unknown>;
        return data.accessOnly !== true;
      })
      .map(docSnapshot => mapAgentRecordToAgent(
        docSnapshot.id,
        docSnapshot.data() as Record<string, unknown>,
      ))
      .filter(agent => agent.is_active && isAvailableAgentStatus(agent.status));

    onData(agents);
  },
  error => {
    console.error('Failed to subscribe to available delivery agents', error);
    onError(toAppServiceError(error, 'Unable to load delivery agents.', 'network'));
  },
);

type UpdateAdminOrderStatusParams = {
  assignedAgent?: DeliveryAgentAssignment | null;
  nextStatus: OrderStatusCode | string;
  order: Order;
  rejectionReason?: string;
};

const buildOrderStatusUpdate = (
  nextStatus: OrderStatusCode,
  rejectionReason: string,
  assignedAgent: DeliveryAgentAssignment | null,
) => {
  const timestampValue = serverTimestamp();
  const update: Record<string, unknown> = {
    orderStatus: nextStatus,
    rejectionReason: nextStatus === 'REJECTED' ? rejectionReason : '',
    rejection_reason: nextStatus === 'REJECTED' ? rejectionReason : '',
    status: getOrderStatusFirestoreValue(nextStatus),
    status_code: nextStatus,
    updatedAt: timestampValue,
    updated_at: timestampValue,
  };

  if (nextStatus === 'ACCEPTED') {
    update.acceptedAt = timestampValue;
    update.accepted_at = timestampValue;
    update['timestamps.acceptedAt'] = timestampValue;
  }

  if (nextStatus === 'PREPARING') {
    update.preparingAt = timestampValue;
    update.preparing_at = timestampValue;
    update['timestamps.preparedAt'] = timestampValue;
  }

  if (nextStatus === 'OUT_FOR_DELIVERY') {
    update.assignedAt = timestampValue;
    update.assigned_at = timestampValue;
    update.deliveryAssignedAt = timestampValue;
    update.delivery_assigned_at = timestampValue;
    update.outForDeliveryAt = timestampValue;
    update.out_for_delivery_at = timestampValue;
    update.deliveryOutForDeliveryAt = timestampValue;
    update.delivery_out_for_delivery_at = timestampValue;
    update['timestamps.outForDeliveryAt'] = timestampValue;

    if (assignedAgent) {
      const normalizedAgentId = assignedAgent.id.trim().toLowerCase();
      update.assignedAgentEmail = assignedAgent.email?.trim().toLowerCase() || normalizedAgentId;
      update.assignedAgentId = normalizedAgentId;
      update.assignedAgentName = assignedAgent.name.trim();
      update.assignedAgentPhone = assignedAgent.phone.trim();
      update.assignedAgentVehicle = assignedAgent.vehicle_type?.trim() || '';
      update.agentEmail = assignedAgent.email?.trim().toLowerCase() || normalizedAgentId;
      update.agentId = normalizedAgentId;
      update.agentName = assignedAgent.name.trim();
      update.agentPhone = assignedAgent.phone.trim();
      update.agentVehicle = assignedAgent.vehicle_type?.trim() || '';
      update.deliveryAgentEmail = assignedAgent.email?.trim().toLowerCase() || normalizedAgentId;
      update.deliveryAgentId = normalizedAgentId;
      update.deliveryAgentName = assignedAgent.name.trim();
      update.deliveryAgentPhone = assignedAgent.phone.trim();
      update.deliveryAgentVehicle = assignedAgent.vehicle_type?.trim() || '';
      update.delivery_agent_email = assignedAgent.email?.trim().toLowerCase() || normalizedAgentId;
      update.delivery_agent_id = normalizedAgentId;
      update.delivery_agent_name = assignedAgent.name.trim();
      update.delivery_agent_phone = assignedAgent.phone.trim();
      update.delivery_agent_vehicle = assignedAgent.vehicle_type?.trim() || '';
    }
  }

  if (nextStatus === 'DELIVERED') {
    update.deliveredAt = timestampValue;
    update.delivered_at = timestampValue;
    update.deliveryDeliveredAt = timestampValue;
    update.delivery_delivered_at = timestampValue;
    update['timestamps.deliveredAt'] = timestampValue;
  }

  if (nextStatus === 'REJECTED') {
    update.rejectedAt = timestampValue;
    update.rejected_at = timestampValue;
    update['timestamps.rejectedAt'] = timestampValue;
  }

  if (nextStatus === 'CANCELLED') {
    update.cancelledAt = timestampValue;
    update.cancelled_at = timestampValue;
    update['timestamps.cancelledAt'] = timestampValue;
  }

  return update;
};

const resolveAssignedAgent = (
  order: Order,
  assignedAgent?: DeliveryAgentAssignment | null,
): DeliveryAgentAssignment | null => {
  if (assignedAgent?.id?.trim()) {
    return {
      email: assignedAgent.email?.trim().toLowerCase() || assignedAgent.id.trim().toLowerCase(),
      id: assignedAgent.id.trim().toLowerCase(),
      name: assignedAgent.name.trim(),
      phone: assignedAgent.phone.trim(),
      vehicle_type: assignedAgent.vehicle_type?.trim() || '',
    };
  }

  if (!order.delivery_agent_id?.trim()) {
    return null;
  }

  return {
    email: order.delivery_agent_email?.trim().toLowerCase() || order.delivery_agent_id.trim().toLowerCase(),
    id: order.delivery_agent_id.trim().toLowerCase(),
    name: order.delivery_agent_name?.trim() || 'Assigned agent',
    phone: order.delivery_agent_phone?.trim() || '',
    vehicle_type: order.delivery_agent_vehicle?.trim() || '',
  };
};

export const updateAdminOrderStatus = async ({
  assignedAgent = null,
  nextStatus,
  order,
  rejectionReason = '',
}: UpdateAdminOrderStatusParams) => {
  const normalizedCurrentStatus = normalizeOrderStatusCode(order.status_code);
  const normalizedNextStatus = normalizeOrderStatusCode(nextStatus);
  const trimmedReason = rejectionReason.trim();
  const resolvedAgent = resolveAssignedAgent(order, assignedAgent);

  if (normalizedCurrentStatus === normalizedNextStatus) {
    throw new AppServiceError('Order is already in that status.', {
      code: 'validation',
    });
  }

  if (isTerminalOrderStatus(normalizedCurrentStatus)) {
    throw new AppServiceError('Delivered, rejected, or cancelled orders cannot be changed.', {
      code: 'validation',
    });
  }

  if (!isValidOrderStatusTransition(normalizedCurrentStatus, normalizedNextStatus)) {
    throw new AppServiceError('That status change is not allowed for this order.', {
      code: 'validation',
    });
  }

  if (requiresRejectionReason(normalizedNextStatus) && !trimmedReason) {
    throw new AppServiceError('Enter a rejection reason before rejecting the order.', {
      code: 'validation',
    });
  }

  if (normalizedNextStatus === 'OUT_FOR_DELIVERY' && !resolvedAgent?.id) {
    throw new AppServiceError('Assign a delivery agent before dispatching this order.', {
      code: 'validation',
    });
  }

  if (normalizedNextStatus === 'DELIVERED' && !resolvedAgent?.id) {
    throw new AppServiceError('This order must be assigned before it can be delivered.', {
      code: 'validation',
    });
  }

  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const orderRef = doc(db, ORDERS_COLLECTION, order.doc_id);

  batch.update(
    orderRef,
    sanitizeFirestoreData(
      buildOrderStatusUpdate(normalizedNextStatus, trimmedReason, resolvedAgent),
    ),
  );

  if (normalizedNextStatus === 'OUT_FOR_DELIVERY' && resolvedAgent) {
    batch.set(
      doc(db, AGENTS_COLLECTION, resolvedAgent.id),
      sanitizeFirestoreData({
        currentOrderId: order.id,
        email: resolvedAgent.email || resolvedAgent.id,
        isActive: true,
        name: resolvedAgent.name,
        phone: resolvedAgent.phone,
        status: 'busy',
        updatedAt: serverTimestamp(),
        vehicle: resolvedAgent.vehicle_type || '',
      }),
      { merge: true },
    );

    batch.set(
      doc(db, DELIVERY_SESSIONS_COLLECTION, order.id),
      sanitizeFirestoreData({
        agentEmail: resolvedAgent.email || resolvedAgent.id,
        agentId: resolvedAgent.id,
        agentName: resolvedAgent.name,
        agentPhone: resolvedAgent.phone,
        agentVehicle: resolvedAgent.vehicle_type || '',
        completedAt: null,
        customerLocation: order.customer_location || null,
        lastLocation: null,
        orderDocId: order.doc_id,
        orderId: order.id,
        startedAt: null,
        status: 'assigned',
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
  }

  if (normalizedNextStatus === 'DELIVERED' && resolvedAgent) {
    batch.set(
      doc(db, AGENTS_COLLECTION, resolvedAgent.id),
      sanitizeFirestoreData({
        currentOrderId: '',
        isActive: true,
        status: 'active',
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );

    batch.set(
      doc(db, DELIVERY_SESSIONS_COLLECTION, order.id),
      sanitizeFirestoreData({
        completedAt: serverTimestamp(),
        orderDocId: order.doc_id,
        orderId: order.id,
        status: 'completed',
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error('Failed to update admin order status', error);
    throw toAppServiceError(error, 'Unable to update the order right now.', 'network');
  }
};
