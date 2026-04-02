import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import type { Order } from '../../types';
import { getFirebaseDb } from './index';

const ORDERS_COLLECTION = 'orders';

export const subscribeToAdminOrders = (
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(getFirebaseDb(), ORDERS_COLLECTION), orderBy('created_at', 'desc')),
  snapshot => {
    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        doc_id: doc.id,
        orderId: data.orderId || doc.id,
        userId: data.userId || data.user_id || '',
        user_id: data.userId || data.user_id || '',
        customer_name: data.customer_name || '',
        phone: data.phone || '',
        address: data.address || '',
        total_amount: data.total_amount || 0,
        status: data.status || 'Pending',
        status_code: data.status_code || 'PENDING',
        created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
        items: data.items || [],
        customerInfo: data.customerInfo || {},
        deliveryAddress: data.deliveryAddress || {},
        pricing: data.pricing || {},
        paymentStatus: data.paymentStatus || 'Pending',
        payment_method: data.payment_method || 'COD',
        paymentMode: data.paymentMode || data.payment_method || 'COD',
        assignedAgentId: data.assignedAgentId || null,
        delivery_agent_id: data.delivery_agent_id || null,
        notes: data.notes || '',
      } as unknown as Order;
    });
    onData(orders);
  },
  error => {
    console.error('Failed to load orders for admin manager', error);
    onError(new Error('Unable to load orders.'));
  },
);
