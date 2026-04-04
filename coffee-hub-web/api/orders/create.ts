import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import { getAdminDb, resolveRequestUser } from '../_lib/firebaseAdmin.js';
import {
  buildAdminNewOrderNotification,
  buildCustomerOrderNotification,
  getAdminRecipients,
  getCustomerRecipient,
  sendPushNotification,
} from '../_lib/notifications.js';
import {
  mapOrderRecordToResponse,
  type StoredOrderRecord,
} from '../_lib/responseMappers.js';
import { assertShopIsOpen } from '../_lib/shopTiming.js';
import {
  assertPricingMatches,
  parseCreateOrderBody,
  recalculatePricing,
  type SanitizedOrderDraft,
  type ValidatedPricing,
} from '../_lib/orderPricing.js';

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
  finalAmount: pricing.finalTotal,
  paymentMode: 'COD',
  paymentStatus: 'PENDING',
  status: 'PENDING',
  orderStatus: 'PENDING',
  rejectionReason: '',
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
    const requestUser = await resolveRequestUser(request, userId);
    const effectiveUserId = requestUser.uid;

    const adminDb = getAdminDb();
    const existingOrder = await loadExistingOrder(adminDb, orderDraft.orderId);
    if (existingOrder) {
      if (existingOrder.data.userId !== effectiveUserId) {
        throw new ApiError(403, 'An order with this receipt already exists for another user.');
      }

      response.status(200).json({
        order: mapOrderRecordToResponse(existingOrder.docId, existingOrder.data),
      });
      return;
    }

    await assertShopIsOpen(adminDb);
    const pricing = await recalculatePricing(adminDb, orderDraft);
    assertPricingMatches(orderDraft, pricing);

    const storedOrder = buildStoredOrderRecord(orderDraft, pricing, effectiveUserId);
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

    try {
      const [customerRecipient, adminRecipients] = await Promise.all([
        getCustomerRecipient(adminDb, effectiveUserId),
        getAdminRecipients(adminDb),
      ]);

      if (customerRecipient) {
        await sendPushNotification(
          adminDb,
          [customerRecipient],
          buildCustomerOrderNotification({
            orderId: orderDraft.orderId,
            status: 'PENDING',
          }),
        );
      }

      if (adminRecipients.length > 0) {
        await sendPushNotification(
          adminDb,
          adminRecipients,
          buildAdminNewOrderNotification(orderDraft.orderId),
        );
      }
    } catch (notificationError) {
      console.error('Order created but notification dispatch failed', notificationError);
    }

    response.status(200).json({
      order: mapOrderRecordToResponse(createdOrder.docId, createdOrder.data),
    });
  } catch (error) {
    sendError(response, error);
  }
}
