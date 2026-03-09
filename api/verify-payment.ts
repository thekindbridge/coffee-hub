import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { ApiError } from './_lib/errors.js';
import { adminDb, verifyRequestUser } from './_lib/firebaseAdmin.js';
import { parseVerifyPaymentBody } from './_lib/orderPricing.js';

interface PaymentSessionRecord {
  orderId: string;
  userId: string;
  razorpayOrderId: string;
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

const getRequiredSecret = () => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured.');
  }

  return secret;
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
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = parseVerifyPaymentBody(request.body);

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

    if (generatedSignature !== razorpaySignature) {
      console.warn('Razorpay signature mismatch', {
        orderId: sessionData.orderId,
        userId: decodedUser.uid,
        razorpayOrderId,
        razorpayPaymentId,
      });

      await sessionDoc.ref.set({
        lastFailedAttemptAt: FieldValue.serverTimestamp(),
        lastFailureReason: 'signature_mismatch',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      throw new ApiError(400, 'Payment signature verification failed.');
    }

    const orderRef = adminDb.collection('orders').doc();
    const orderItemsCollection = adminDb.collection('order_items');

    await adminDb.runTransaction(async transaction => {
      const freshSessionSnapshot = await transaction.get(sessionDoc.ref);
      if (!freshSessionSnapshot.exists) {
        throw new ApiError(404, 'Payment session was not found.');
      }

      const freshSession = freshSessionSnapshot.data() as PaymentSessionRecord;
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
    });

    response.status(200).json({
      order: {
        id: sessionData.orderId,
        doc_id: orderRef.id,
        customer_name: sessionData.customer.name,
        phone: sessionData.customer.phone,
        address: sessionData.customer.address,
        total_amount: sessionData.pricing.finalTotal,
        subtotal: sessionData.pricing.subtotal,
        discount: sessionData.pricing.discount,
        delivery_fee: sessionData.pricing.deliveryFee,
        coupon_code: sessionData.pricing.couponCode,
        final_total: sessionData.pricing.finalTotal,
        status: 'Pending',
        payment_method: 'razorpay',
        payment_status: 'paid',
        created_at: new Date().toISOString(),
        user_id: sessionData.userId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        items: sessionData.items.map(item => ({
          id: item.id,
          order_id: sessionData.orderId,
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    });
  } catch (error) {
    sendError(response, error);
  }
}
