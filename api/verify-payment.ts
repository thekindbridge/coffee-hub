import crypto from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from './_lib/errors.js';
import { getAdminDb, verifyRequestUser } from './_lib/firebaseAdmin.js';
import { parseVerifyPaymentBody } from './_lib/orderPricing.js';

interface PaymentSessionRecord {
  orderId: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  orderDocId?: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  pricing: {
    subtotal: number;
    discount: number;
    deliveryFee: number;
    finalTotal: number;
    couponCode: string;
  };
  status: 'created' | 'paid' | 'failed';
}

interface StoredOrderRecord {
  status?: 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered';
  createdAt?: {
    toDate?: () => Date;
  };
}

const getRequiredSecret = () => {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured.');
  }

  return secret;
};

const isMatchingSignature = (expectedSignature: string, actualSignature: string) => {
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(actualSignature, 'utf8');

  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

const buildOrderResponse = (params: {
  orderDocId: string;
  session: PaymentSessionRecord;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  createdAt?: string;
  status?: 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered';
}) => ({
  order: {
    id: params.session.orderId,
    doc_id: params.orderDocId,
    customer_name: params.session.customer.name,
    phone: params.session.customer.phone,
    address: params.session.customer.address,
    total_amount: params.session.pricing.finalTotal,
    subtotal: params.session.pricing.subtotal,
    discount: params.session.pricing.discount,
    delivery_fee: params.session.pricing.deliveryFee,
    coupon_code: params.session.pricing.couponCode,
    final_total: params.session.pricing.finalTotal,
    status: params.status || 'Pending',
    payment_method: 'razorpay',
    payment_status: 'paid' as const,
    created_at: params.createdAt || new Date().toISOString(),
    user_id: params.session.userId,
    razorpay_order_id: params.razorpayOrderId,
    razorpay_payment_id: params.razorpayPaymentId,
    razorpay_signature: params.razorpaySignature,
    items: params.session.items.map(item => ({
      id: item.id,
      order_id: params.session.orderId,
      menu_item_id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  },
});

const loadExistingOrder = async (orderId: string, orderDocId?: string) => {
  const adminDb = getAdminDb();

  if (orderDocId) {
    const orderDoc = await adminDb.collection('orders').doc(orderDocId).get();
    if (orderDoc.exists) {
      return {
        docId: orderDoc.id,
        data: orderDoc.data() as StoredOrderRecord,
      };
    }
  }

  const orderQuery = await adminDb.collection('orders').where('orderId', '==', orderId).limit(1).get();
  if (orderQuery.empty) {
    return null;
  }

  const orderDoc = orderQuery.docs[0];
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

  console.error('Unhandled verify-payment error', error);
  response.status(500).json({ error: 'Unable to verify payment right now.' });
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const decodedUser = await verifyRequestUser(request);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parseVerifyPaymentBody(request.body);
    const adminDb = getAdminDb();

    const sessionQuery = await adminDb
      .collection('payment_sessions')
      .where('razorpayOrderId', '==', razorpayOrderId)
      .limit(1)
      .get();

    if (sessionQuery.empty) {
      throw new ApiError(404, 'Payment session was not found.');
    }

    const sessionDoc = sessionQuery.docs[0];
    const sessionData = sessionDoc.data() as PaymentSessionRecord;

    if (sessionData.userId !== decodedUser.uid) {
      throw new ApiError(403, 'This payment session belongs to another user.');
    }

    const generatedSignature = crypto
      .createHmac('sha256', getRequiredSecret())
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!isMatchingSignature(generatedSignature, razorpaySignature)) {
      console.warn('Razorpay signature mismatch', {
        orderId: sessionData.orderId,
        userId: decodedUser.uid,
        razorpayOrderId,
        razorpayPaymentId,
      });

      await sessionDoc.ref.set(
        {
          lastFailedAttemptAt: FieldValue.serverTimestamp(),
          lastFailureReason: 'signature_mismatch',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      throw new ApiError(400, 'Payment signature verification failed.');
    }

    if (sessionData.status === 'paid') {
      const existingOrder = await loadExistingOrder(sessionData.orderId, sessionData.orderDocId);
      if (!existingOrder) {
        throw new Error('Payment session is marked paid, but the order record could not be found.');
      }

      response.status(200).json(
        buildOrderResponse({
          orderDocId: existingOrder.docId,
          session: sessionData,
          razorpayOrderId,
          razorpayPaymentId: sessionData.razorpayPaymentId || razorpayPaymentId,
          razorpaySignature: sessionData.razorpaySignature || razorpaySignature,
          createdAt: existingOrder.data.createdAt?.toDate?.()?.toISOString(),
          status: existingOrder.data.status || 'Pending',
        }),
      );
      return;
    }

    const orderRef = adminDb.collection('orders').doc();
    const orderItemsCollection = adminDb.collection('order_items');
    let verifiedOrderDocId = orderRef.id;
    let verifiedSessionData = sessionData;

    await adminDb.runTransaction(async transaction => {
      const freshSessionSnapshot = await transaction.get(sessionDoc.ref);
      if (!freshSessionSnapshot.exists) {
        throw new ApiError(404, 'Payment session was not found.');
      }

      const freshSession = freshSessionSnapshot.data() as PaymentSessionRecord;
      verifiedSessionData = freshSession;

      if (freshSession.userId !== decodedUser.uid) {
        throw new ApiError(403, 'This payment session belongs to another user.');
      }

      if (freshSession.status === 'paid') {
        verifiedOrderDocId = freshSession.orderDocId || verifiedOrderDocId;
        verifiedSessionData = {
          ...freshSession,
          razorpayPaymentId: freshSession.razorpayPaymentId || razorpayPaymentId,
          razorpaySignature: freshSession.razorpaySignature || razorpaySignature,
        };
        return;
      }

      if (freshSession.status !== 'created') {
        console.warn('Duplicate payment verification attempt', {
          orderId: freshSession.orderId,
          razorpayOrderId,
          userId: decodedUser.uid,
          currentStatus: freshSession.status,
        });
        throw new ApiError(409, 'Payment session has already been processed.');
      }

      const existingOrderSnapshot = await transaction.get(
        adminDb.collection('orders').where('orderId', '==', freshSession.orderId).limit(1),
      );
      if (!existingOrderSnapshot.empty) {
        throw new ApiError(409, 'An order with this receipt already exists.');
      }

      transaction.set(orderRef, {
        orderId: freshSession.orderId,
        userId: freshSession.userId,
        customerName: freshSession.customer.name,
        name: freshSession.customer.name,
        phone: freshSession.customer.phone,
        address: freshSession.customer.address,
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        razorpayOrderId,
        razorpayPaymentId,
        subtotal: freshSession.pricing.subtotal,
        discount: freshSession.pricing.discount,
        deliveryFee: freshSession.pricing.deliveryFee,
        couponCode: freshSession.pricing.couponCode,
        finalTotal: freshSession.pricing.finalTotal,
        total: freshSession.pricing.finalTotal,
        status: 'Pending',
        createdAt: FieldValue.serverTimestamp(),
      });

      freshSession.items.forEach(item => {
        transaction.set(orderItemsCollection.doc(), {
          orderId: freshSession.orderId,
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        });
      });

      transaction.update(sessionDoc.ref, {
        status: 'paid',
        razorpayPaymentId,
        razorpaySignature,
        orderDocId: orderRef.id,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      verifiedOrderDocId = orderRef.id;
      verifiedSessionData = {
        ...freshSession,
        status: 'paid',
        razorpayPaymentId,
        razorpaySignature,
        orderDocId: orderRef.id,
      };
    });

    const existingOrder = await loadExistingOrder(verifiedSessionData.orderId, verifiedOrderDocId);

    response.status(200).json(
      buildOrderResponse({
        orderDocId: existingOrder?.docId || verifiedOrderDocId,
        session: verifiedSessionData,
        razorpayOrderId,
        razorpayPaymentId: verifiedSessionData.razorpayPaymentId || razorpayPaymentId,
        razorpaySignature: verifiedSessionData.razorpaySignature || razorpaySignature,
        createdAt: existingOrder?.data.createdAt?.toDate?.()?.toISOString(),
        status: existingOrder?.data.status || 'Pending',
      }),
    );
  } catch (error) {
    sendError(response, error);
  }
}
