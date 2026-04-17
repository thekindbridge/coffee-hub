import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from '../_lib/errors.js';
import { getAdminDb, verifyRequestUser } from '../_lib/firebaseAdmin.js';
import {
  buildAdminNewOrderNotification,
  getAdminRecipients,
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
import { getOrderStatusFirestoreValue } from '../../shared/orderStatus.js';

const buildStoredOrderRecord = (
  orderDraft: SanitizedOrderDraft,
  pricing: ValidatedPricing,
  userId: string,
  email: string,
): StoredOrderRecord => ({
  userId,
  email,
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
  status: getOrderStatusFirestoreValue('PENDING'),
  orderStatus: 'PENDING',
  status_code: 'PENDING',
  rejectionReason: '',
  assignedAgentEmail: '',
  assignedAgentId: '',
  assignedAgentName: '',
  assignedAgentPhone: '',
  assignedAgentVehicle: '',
});

const ORDER_COUNTER_START = 1001;

const buildOrderId = (orderNumber: number) => `COF${String(orderNumber).padStart(4, '0')}`;

const createOrderWithNextNumber = async (
  db: Firestore,
  storedOrder: StoredOrderRecord,
) => {
  const orderRef = db.collection('orders').doc();

  return db.runTransaction(async transaction => {
    const counterRef = db.collection('meta').doc('orderCounter');
    const counterSnapshot = await transaction.get(counterRef);
    const currentValue =
      counterSnapshot.exists && typeof counterSnapshot.data()?.nextOrderNumber === 'number'
        ? counterSnapshot.data()!.nextOrderNumber
        : ORDER_COUNTER_START;
    const orderId = buildOrderId(currentValue);

    transaction.set(
      orderRef,
      {
        ...storedOrder,
        orderId,
        createdAt: FieldValue.serverTimestamp(),
        timestamps: {
          createdAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
    );

    transaction.set(
      counterRef,
      {
        nextOrderNumber: currentValue + 1,
      },
      { merge: true },
    );

    return {
      orderId,
      orderNumber: currentValue,
      orderRef,
    };
  });
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
    const decodedToken = await verifyRequestUser(request);
    const { orderDraft } = parseCreateOrderBody(request.body);
    const effectiveUserId = decodedToken.uid;
    const effectiveEmail = (decodedToken.email || '').trim().toLowerCase();

    const adminDb = getAdminDb();
    await assertShopIsOpen(adminDb);
    const pricing = await recalculatePricing(adminDb, orderDraft);
    assertPricingMatches(orderDraft, pricing);

    const storedOrder = buildStoredOrderRecord(
      orderDraft,
      pricing,
      effectiveUserId,
      effectiveEmail,
    );
    const { orderId, orderNumber, orderRef } = await createOrderWithNextNumber(adminDb, storedOrder);

    const createdOrderSnapshot = await orderRef.get();
    if (!createdOrderSnapshot.exists) {
      throw new Error('Order was created, but could not be loaded afterwards.');
    }

    try {
      const adminRecipients = await getAdminRecipients(adminDb);

      if (adminRecipients.length > 0) {
        await sendPushNotification(
          adminDb,
          adminRecipients,
          buildAdminNewOrderNotification(orderId),
        );
      }
    } catch (notificationError) {
      console.error('Order created but notification dispatch failed', notificationError);
    }

    response.status(200).json({
      success: true,
      order: mapOrderRecordToResponse(
        createdOrderSnapshot.id,
        createdOrderSnapshot.data() as StoredOrderRecord,
      ),
      orderNumber: orderId,
      numericOrderNumber: orderNumber,
    });
  } catch (error) {
    sendError(response, error);
  }
}
