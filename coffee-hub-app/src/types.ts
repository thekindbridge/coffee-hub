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

export type DiscountType = 'percentage' | 'flat';

export interface ShopTiming {
  openTime: number;
  closeTime: number;
  updatedAt?: string;
}

export type NotificationSettings = {
  orderUpdates: boolean;
  offers: boolean;
};

export interface CustomerProfile {
  name: string;
  phone: string;
  email: string;
  addresses: string[];
  notificationSettings: NotificationSettings;
}

export type CheckoutStep = 'cart' | 'details' | 'success';
export type SelectedAddressIndex = number | 'new';

export interface SavedAddressOption {
  index: number;
  label: string;
  value: string;
}

export interface DeliveryLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updated_at?: string;
}

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

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  doc_id: string;
  customer_name: string;
  phone: string;
  address: string;
  total_amount: number;
  subtotal?: number;
  discount?: number;
  delivery_fee?: number;
  coupon_code?: string;
  final_total?: number;
  status: string;
  status_code: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  payment_method: string;
  payment_status?: string;
  created_at: string;
  updated_at?: string;
  cancelled_at?: string;
  user_id: string;
  customer_location?: DeliveryLocation | null;
  delivery_location?: DeliveryLocation | null;
  delivery_agent_id?: string;
  delivery_agent_name?: string;
  delivery_agent_phone?: string;
  delivery_agent_email?: string;
  delivery_agent_vehicle?: string;
  delivery_assigned_at?: string;
  delivery_picked_at?: string;
  delivery_out_for_delivery_at?: string;
  delivery_delivered_at?: string;
  preparing_at?: string;
  ready_for_pickup_at?: string;
  items?: OrderItem[];
}

export interface CheckoutCustomerDetails {
  name: string;
  phone: string;
  address: string;
  location: DeliveryLocation | null;
}

export interface CheckoutOrderItemPayload {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CheckoutOrderDraft {
  orderId: string;
  customer: CheckoutCustomerDetails;
  items: CheckoutOrderItemPayload[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  couponCode: string;
  finalTotal: number;
}

export interface CreateOrderResponse {
  order: Order;
}

export interface OrdersResponse {
  orders: Order[];
}
