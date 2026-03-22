import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from './_lib/errors.js';
import { getAdminDb, verifyRequestUser } from './_lib/firebaseAdmin.js';
import { assertShopIsOpen } from './_lib/shopTiming.js';
import {
  assertPricingMatches,
  parseCreateOrderBody,
  recalculatePricing,
  type SanitizedOrderDraft,
  type ValidatedPricing,
} from './_lib/orderPricing.js';

interface StoredOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

interface StoredOrderRecord {
  orderId: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  customerLocation: {
    lat: number;
    lng: number;
  };
  items: StoredOrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  couponCode: string;
  totalAmount: number;
  paymentMode: 'COD';
  paymentStatus: 'PENDING' | 'PAID';
  orderStatus: 'PLACED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  createdAt?: {
    toDate?: () => Date;
  };
}

const mapStoredStatusToResponse = (value: unknown) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'preparing') {
      return 'Preparing' as const;
    }

    if (normalized === 'out_for_delivery' || normalized === 'out for delivery') {
      return 'Out for Delivery' as const;
    }

    if (normalized === 'delivered') {
      return 'Delivered' as const;
    }
  }

  return 'Pending' as const;
};

const mapStoredPaymentStatusToResponse = (value: unknown) => {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'paid') {
    return 'paid' as const;
  }

  return 'pending' as const;
};

const mapStoredItemsToResponse = (orderId: string, items: StoredOrderItem[] = []) =>
  items.map((item, index) => ({
    id: `${item.itemId || 'item'}-${index + 1}`,
    order_id: orderId,
    menu_item_id: item.itemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

const buildStoredOrderRecord = (
  orderDraft: SanitizedOrderDraft,
  pricing: ValidatedPricing,
  userId: string,
): StoredOrderRecord => ({
  orderId: orderDraft.orderId,
  userId,
  name: orderDraft.customer.name,
  phone: orderDraft.customer.phone,
  address: orderDraft.customer.address,
  customerLocation: orderDraft.customer.location,
  items: pricing.items.map(item => ({
    itemId: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  })),
  subtotal: pricing.subtotal,
  discount: pricing.discount,
  deliveryFee: pricing.deliveryFee,
  couponCode: pricing.couponCode,
  totalAmount: pricing.finalTotal,
  paymentMode: 'COD',
  paymentStatus: 'PENDING',
  orderStatus: 'PLACED',
});

const buildOrderResponse = (orderDocId: string, storedOrder: StoredOrderRecord) => ({
  order: {
    id: storedOrder.orderId,
    doc_id: orderDocId,
    customer_name: storedOrder.name,
    phone: storedOrder.phone,
    address: storedOrder.address,
    customer_location: storedOrder.customerLocation,
    total_amount: Number(storedOrder.totalAmount || 0),
    subtotal: Number(storedOrder.subtotal || 0),
    discount: Number(storedOrder.discount || 0),
    delivery_fee: Number(storedOrder.deliveryFee || 0),
    coupon_code: (storedOrder.couponCode || '').toUpperCase(),
    final_total: Number(storedOrder.totalAmount || 0),
    status: mapStoredStatusToResponse(storedOrder.orderStatus),
    payment_method: storedOrder.paymentMode || 'COD',
    payment_status: mapStoredPaymentStatusToResponse(storedOrder.paymentStatus),
    created_at: storedOrder.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    user_id: storedOrder.userId,
    items: mapStoredItemsToResponse(storedOrder.orderId, storedOrder.items),
  },
});

const loadExistingOrder = async (db: Firestore, orderId: string) => {
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    return null;
  }

  return {
    docId: orderDoc.id,
    data: orderDoc.data() as StoredOrderRecord,
  };
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled create-order error', error);
  response.status(500).json({ error: 'Unable to create the order right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const { orderDraft, userId } = parseCreateOrderBody(request.body);
    await verifyRequestUser(request, userId);

    const adminDb = getAdminDb();
    const existingOrder = await loadExistingOrder(adminDb, orderDraft.orderId);
    if (existingOrder) {
      if (existingOrder.data.userId !== userId) {
        throw new ApiError(403, 'An order with this receipt already exists for another user.');
      }

      response.status(200).json(buildOrderResponse(existingOrder.docId, existingOrder.data));
      return;
    }

    await assertShopIsOpen(adminDb);
    const pricing = await recalculatePricing(adminDb, orderDraft);
    assertPricingMatches(orderDraft, pricing);

    const storedOrder = buildStoredOrderRecord(orderDraft, pricing, userId);
    const orderRef = adminDb.collection('orders').doc(orderDraft.orderId);

    await orderRef.set({
      ...storedOrder,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const createdOrder = await loadExistingOrder(adminDb, orderDraft.orderId);
    if (!createdOrder) {
      throw new Error('Order was created, but could not be loaded afterwards.');
    }

    response.status(200).json(buildOrderResponse(createdOrder.docId, createdOrder.data));
  } catch (error) {
    sendError(response, error);
  }
}
