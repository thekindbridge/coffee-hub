import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';

import { ApiError } from './_lib/errors.js';
import { getAdminDb, verifyRequestUser } from './_lib/firebaseAdmin.js';
import { assertPricingMatches, parseCreateOrderBody, recalculatePricing } from './_lib/orderPricing.js';

interface PaymentSessionRecord {
  orderId: string;
  userId: string;
  razorpayOrderId: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  pricing: {
    finalTotal: number;
    deliveryFee: number;
  };
  status: 'created' | 'paid' | 'failed';
}

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay server credentials are not configured.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const buildExistingSessionResponse = (session: PaymentSessionRecord) => ({
  orderId: session.orderId,
  razorpayOrderId: session.razorpayOrderId,
  amount: Math.round(session.pricing.finalTotal * 100),
  currency: 'INR',
  finalTotal: session.pricing.finalTotal,
  deliveryCharge: session.pricing.deliveryFee,
});

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

    const adminDb = getAdminDb();
    const pricing = await recalculatePricing(adminDb, orderDraft);
    assertPricingMatches(orderDraft, pricing);

    const paymentSessionRef = adminDb.collection('payment_sessions').doc(orderDraft.orderId);
    const [existingOrderSnapshot, existingSessionSnapshot] = await Promise.all([
      adminDb.collection('orders').where('orderId', '==', orderDraft.orderId).limit(1).get(),
      paymentSessionRef.get(),
    ]);

    if (!existingOrderSnapshot.empty) {
      throw new ApiError(409, 'An order with this receipt already exists. Please refresh checkout and try again.');
    }

    if (existingSessionSnapshot.exists) {
      const existingSession = existingSessionSnapshot.data() as PaymentSessionRecord;

      if (existingSession.userId !== userId) {
        throw new ApiError(403, 'An order with this receipt already exists for another user.');
      }

      if (existingSession.status !== 'created') {
        throw new ApiError(409, 'This payment session has already been processed. Please refresh checkout.');
      }

      response.status(200).json(buildExistingSessionResponse(existingSession));
      return;
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

    await paymentSessionRef.set({
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
      orderId: orderDraft.orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      finalTotal: pricing.finalTotal,
      deliveryCharge: pricing.deliveryFee,
    });
  } catch (error) {
    sendError(response, error);
  }
}
