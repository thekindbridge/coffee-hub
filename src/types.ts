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
  coupon_code?: string;
  final_total?: number;
  status: 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered';
  payment_method: string;
  created_at: string;
  user_id: string;
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
