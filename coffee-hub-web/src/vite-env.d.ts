/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY?: string;
  readonly VITE_AUTH_DOMAIN?: string;
  readonly VITE_PROJECT_ID?: string;
  readonly VITE_STORAGE_BUCKET?: string;
  readonly VITE_MESSAGING_SENDER_ID?: string;
  readonly VITE_APP_ID?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_GOOGLE_MAP_KEY: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayErrorPayload {
  code?: string;
  description?: string;
  reason?: string;
  source?: string;
  step?: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
}

interface RazorpayInstance {
  open: () => void;
  on: (eventName: 'payment.failed', handler: (response: { error?: RazorpayErrorPayload }) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayInstance;
}

interface Window {
  Razorpay?: RazorpayConstructor;
}
