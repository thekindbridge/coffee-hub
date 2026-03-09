import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { ApiError } from './_lib/errors.js';
import { adminDb, verifyRequestUser } from './_lib/firebaseAdmin.ts';
import { assertPricingMatches, parseCreateOrderBody, recalculatePricing } from './_lib/orderPricing';

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay server credentials are not configured.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const sendError = (response: VercelResponse, error: unknown) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Unhandled create-order error', error);
  response.status(500).json({ error: 'Unable to create payment order right now.' });
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

    const pricing = await recalculatePricing(adminDb, orderDraft);
    assertPricingMatches(orderDraft, pricing);

    const [existingOrderSnapshot, existingSessionSnapshot] = await Promise.all([
      adminDb.collection('orders').where('orderId', '==', orderDraft.orderId).limit(1).get(),
      adminDb.collection('payment_sessions').where('orderId', '==', orderDraft.orderId).limit(1).get(),
    ]);

    if (!existingOrderSnapshot.empty || !existingSessionSnapshot.empty) {
      throw new ApiError(409, 'An order with this receipt already exists. Please refresh checkout and try again.');
    }

    const razorpayOrder = await getRazorpayClient().orders.create({
      amount: Math.round(pricing.finalTotal * 100),
      currency: 'INR',
      receipt: orderDraft.orderId,
      notes: {
        orderId: orderDraft.orderId,
        userId,
      },
    });

    await adminDb.collection('payment_sessions').doc(orderDraft.orderId).set({
      orderId: orderDraft.orderId,
      userId,
      razorpayOrderId: razorpayOrder.id,
      items: pricing.items,
      customer: orderDraft.customer,
      pricing,
      status: 'created',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    response.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (error) {
    sendError(response, error);
  }
}
