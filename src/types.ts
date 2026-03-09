export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  spice_level: number;
  is_veg: boolean;
  rating: number;
  image_url: string;
  description: string;
  is_available: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export type CheckoutPaymentOption = 'Cash on Delivery' | 'Pay Online';
export type OrderPaymentStatus = 'pending' | 'paid' | 'failed';
export type DeliverySessionStatus = 'assigned' | 'active' | 'completed';

export interface DeliveryLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updated_at?: string;
}

export interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  current_order_id: string;
  last_location: DeliveryLocation | null;
}

export interface DeliverySession {
  order_id: string;
  order_doc_id: string;
  agent_id: string;
  agent_name: string;
  status: DeliverySessionStatus;
  started_at?: string;
  completed_at?: string;
}

export interface DeliveryRouteMetrics {
  distance_meters: number | null;
  distance_text: string;
  duration_text: string;
  duration_in_traffic_text: string;
  eta_minutes: number | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string; // Human-friendly id, e.g. COF1001
  doc_id: string; // Firestore document id
  customer_name: string;
  phone: string;
  address: string;
  total_amount: number;
  subtotal?: number;
  discount?: number;
  delivery_fee?: number;
  coupon_code?: string;
  final_total?: number;
  status: 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered';
  payment_method: string;
  payment_status?: OrderPaymentStatus;
  created_at: string;
  user_id: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  customer_location?: DeliveryLocation | null;
  delivery_agent_id?: string;
  delivery_agent_name?: string;
  delivery_agent_phone?: string;
  delivery_assigned_at?: string;
  items?: OrderItem[];
}

export type DiscountType = 'percentage' | 'flat';

export interface Offer {
  id: string;
  title: string;
  description: string;
  couponCode: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface OfferInput {
  title: string;
  description: string;
  couponCode: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isActive: boolean;
}

export interface CheckoutCustomerDetails {
  name: string;
  phone: string;
  address: string;
  location: DeliveryLocation | null;
  payment: CheckoutPaymentOption;
}

export interface CheckoutOrderItemPayload {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CheckoutOrderDraft {
  orderId: string;
  customer: Omit<CheckoutCustomerDetails, 'payment'>;
  items: CheckoutOrderItemPayload[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  couponCode: string;
  finalTotal: number;
}

export interface RazorpayOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  finalTotal: number;
  deliveryCharge: number;
}

export interface RazorpayVerificationResponse {
  order: Order;
}
