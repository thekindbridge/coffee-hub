/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Home, 
  Menu as MenuIcon, 
  ShoppingBag, 
  Coffee,
  Tag, 
  Plus, 
  Minus, 
  X, 
  ChevronRight, 
  Star, 
  Flame, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  Search,
  CreditCard,
  Wallet,
  LoaderCircle,
  Sparkles,
  LogOut,
  BadgePercent,
  Leaf,
  ShieldCheck,
  ChefHat,
  Truck,
  Gift
} from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import {
  MenuItem,
  CartItem,
  CheckoutCustomerDetails,
  DeliveryAgent,
  DeliveryLocation,
  DeliverySession,
  CheckoutOrderDraft,
  CheckoutOrderItemPayload,
  CheckoutPaymentOption,
  Order,
  OrderItem,
  RazorpayOrderResponse,
  RazorpayVerificationResponse,
} from './types';
import { useOffers } from './hooks/useOffers';
import { calculateDiscount } from './utils/calculateDiscount';
import { loadRazorpayCheckout } from './utils/loadRazorpayCheckout';
import { postPaymentApi } from './utils/paymentApi';
import {
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from './agent/agentTracker';
import AdminDashboard from './components/AdminDashboard';
import AgentDashboard from './components/AgentDashboard';
import MyOrders from './components/MyOrders';
import OrderTrackingPage from './pages/OrderTrackingPage';

// --- Components ---

const ORDER_STATUSES: Order['status'][] = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
const ORDER_ITEMS_IN_QUERY_LIMIT = 10;
const ADMIN_EMAIL = 'thekindbridge@gmail.com';
const DELIVERY_AGENT_EMAIL = 'pavankumarnaidu343@gmail.com';
const CURRENCY_SYMBOL = '\u20B9';
const STANDARD_DELIVERY_FEE = 50;
const AUTH_BACKGROUND_IMAGE = 'url(https://res.cloudinary.com/ddfhaqeme/image/upload/v1772713816/5f272fcd-02a1-4f33-b91c-9ff009e08610_z4faz2.jpg)';
const DEFAULT_DELIVERY_AGENT = {
  id: 'INKOLLU_AGENT_01',
  name: 'Inkollu Delivery Agent',
  phone: '',
};
const COFFEE_SHOP_LOCATION: DeliveryLocation = {
  lat: 15.5057,
  lng: 80.0499,
};
const CHECKOUT_PAYMENT_OPTIONS: CheckoutPaymentOption[] = ['Pay Online', 'Cash on Delivery'];
const RAZORPAY_KEY_ID = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();
const DEFAULT_TRACKER_STATUS: AgentTrackerStatus = {
  lifecycle: 'idle',
  message: 'Start delivery to begin live GPS streaming.',
};

const mapTimestampToIsoString = (value: unknown) => {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return '';
};

const mapLocationRecord = (value: unknown): DeliveryLocation | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : undefined,
    updated_at: mapTimestampToIsoString(data.updatedAt),
  };
};

const mapDeliveryAgentDocToAgent = (snapshot: QueryDocumentSnapshot): DeliveryAgent => {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    id: snapshot.id,
    name: (data.name as string) || 'Delivery Partner',
    phone: (data.phone as string) || '',
    is_active: Boolean(data.isActive ?? false),
    current_order_id: (data.currentOrderId as string) || '',
    last_location: mapLocationRecord(data.lastLocation),
  };
};

const mapDeliverySessionDocToSession = (snapshot: QueryDocumentSnapshot): DeliverySession => {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    order_id: snapshot.id,
    order_doc_id: (data.orderDocId as string) || '',
    agent_id: (data.agentId as string) || '',
    agent_name: (data.agentName as string) || '',
    status: ((data.status as DeliverySession['status']) || 'assigned'),
    started_at: mapTimestampToIsoString(data.startedAt),
    completed_at: mapTimestampToIsoString(data.completedAt),
  };
};

const normalizeOrderStatus = (status: unknown): Order['status'] => {
  if (status === 'Placed' || status === 'Pending') {
    return 'Pending';
  }

  if (status === 'Preparing' || status === 'Out for Delivery' || status === 'Delivered') {
    return status;
  }

  return 'Pending';
};

type CustomerProfile = {
  name: string;
  phone: string;
  email: string;
  addresses: string[];
};

type StaffRole = 'admin' | 'agent';
type AgentVehicleType = '' | 'Bike' | 'Scooter' | 'Cycle';
type AgentStatus = 'Available' | 'Offline';

type StaffProfile = {
  role: StaffRole;
  name: string;
  phone: string;
  email: string;
  adminLocation: string;
  vehicleType: AgentVehicleType;
  status: AgentStatus;
};

type AccessEntry = {
  id: string;
  email: string;
  role: 'admin' | 'delivery';
  accessOnly?: boolean;
};

const EMPTY_PROFILE: CustomerProfile = {
  name: '',
  phone: '',
  email: '',
  addresses: ['', '', ''],
};

const EMPTY_STAFF_PROFILE: StaffProfile = {
  role: 'admin',
  name: '',
  phone: '',
  email: '',
  adminLocation: '',
  vehicleType: '',
  status: 'Available',
};

const ensureProfileAddresses = (addresses: string[] = []) => {
  const normalized = [...addresses];
  while (normalized.length < 3) {
    normalized.push('');
  }
  return normalized.slice(0, 3);
};

const mapProfileDocToProfile = (data?: Record<string, unknown>): CustomerProfile => {
  if (!data) {
    return { ...EMPTY_PROFILE };
  }

  const addressRecord = data.addresses && typeof data.addresses === 'object'
    ? (data.addresses as Record<string, unknown>)
    : {};

  return {
    name: (data.name as string) || '',
    phone: (data.phone as string) || '',
    email: (data.email as string) || '',
    addresses: ensureProfileAddresses([
      (addressRecord.address1 as string) || '',
      (addressRecord.address2 as string) || '',
      (addressRecord.address3 as string) || '',
    ]),
  };
};

const normalizeStaffRole = (value: unknown, fallback: StaffRole): StaffRole =>
  value === 'admin' || value === 'agent' ? value : fallback;

const normalizeVehicleType = (value: unknown): AgentVehicleType =>
  value === 'Bike' || value === 'Scooter' || value === 'Cycle' ? value : '';

const normalizeAgentStatus = (value: unknown): AgentStatus => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'available') return 'Available';
    if (normalized === 'offline') return 'Offline';
  }
  return 'Available';
};

const mapStaffProfileDocToProfile = (
  data: Record<string, unknown> | undefined,
  fallbackRole: StaffRole,
): StaffProfile => ({
  role: normalizeStaffRole(data?.role, fallbackRole),
  name: (data?.name as string) || '',
  phone: (data?.phone as string) || '',
  email: (data?.email as string) || '',
  adminLocation: (data?.adminLocation as string) || '',
  vehicleType: normalizeVehicleType(data?.vehicleType),
  status: normalizeAgentStatus(data?.status),
});

const stripPhonePrefix = (phone: string) => phone.replace(/^\+91\s*/i, '');

const formatPhoneWithPrefix = (phone: string) => {
  const trimmed = phone.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  return `+91 ${trimmed}`;
};

const buildProfileDraft = (profile: CustomerProfile) => ({
  ...profile,
  phone: stripPhonePrefix(profile.phone),
  addresses: ensureProfileAddresses(profile.addresses),
});

const buildStaffProfileDraft = (profile: StaffProfile): StaffProfile => ({
  ...profile,
  phone: stripPhonePrefix(profile.phone),
});

const mapMenuDocToMenuItem = (snapshot: QueryDocumentSnapshot): MenuItem => {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    id: snapshot.id,
    name: (data.name as string) || '',
    category: (data.category as string) || 'Other',
    price: Number(data.price || 0),
    spice_level: Number(data.spiceLevel ?? 0),
    is_veg: Boolean(data.veg ?? true),
    rating: Number(data.rating || 0),
    image_url: (data.image as string) || '',
    description: (data.description as string) || '',
    is_available: data.isAvailable !== false,
  };
};

const mapOrderDocToOrder = (snapshot: QueryDocumentSnapshot): Order => {
  const data = snapshot.data() as Record<string, unknown>;
  const createdAtValue = data.createdAt as Timestamp | undefined;
  const subtotal = Number(data.subtotal ?? data.total ?? 0);
  const discount = Number(data.discount || 0);
  const deliveryFee = Number(data.deliveryFee || 0);
  const finalTotal = Number(data.finalTotal ?? data.total ?? Math.max(0, subtotal - discount));

  return {
    id: ((data.orderId as string) || snapshot.id).toUpperCase(),
    doc_id: snapshot.id,
    customer_name: (data.name as string) || '',
    phone: (data.phone as string) || '',
    address: (data.address as string) || '',
    customer_location: mapLocationRecord(data.customerLocation),
    total_amount: finalTotal,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    coupon_code: ((data.couponCode as string) || '').toUpperCase(),
    final_total: finalTotal,
    status: normalizeOrderStatus(data.status),
    payment_method: (data.paymentMethod as string) || 'Cash on Delivery',
    payment_status: (data.paymentStatus as Order['payment_status']) || 'pending',
    created_at: createdAtValue?.toDate()?.toISOString() || new Date().toISOString(),
    user_id: (data.userId as string) || '',
    razorpay_order_id: (data.razorpayOrderId as string) || '',
    razorpay_payment_id: (data.razorpayPaymentId as string) || '',
    razorpay_signature: (data.razorpaySignature as string) || '',
    delivery_agent_id: (data.deliveryAgentId as string) || '',
    delivery_agent_name: (data.deliveryAgentName as string) || '',
    delivery_agent_phone: (data.deliveryAgentPhone as string) || '',
    delivery_assigned_at: ((data.deliveryAssignedAt as Timestamp | undefined)?.toDate()?.toISOString()) || '',
  };
};

const buildLocalOrderState = (params: {
  docId: string;
  orderId: string;
  customer: Omit<CheckoutCustomerDetails, 'payment'>;
  paymentMethod: string;
  paymentStatus?: Order['payment_status'];
  userId: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  couponCode: string;
  finalTotal: number;
  items: CheckoutOrderItemPayload[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  createdAt?: string;
}): Order => ({
  id: params.orderId,
  doc_id: params.docId,
  customer_name: params.customer.name,
  phone: params.customer.phone,
  address: params.customer.address,
  customer_location: params.customer.location,
  total_amount: params.finalTotal,
  subtotal: params.subtotal,
  discount: params.discount,
  delivery_fee: params.deliveryFee,
  coupon_code: params.couponCode,
  final_total: params.finalTotal,
  status: 'Pending',
  payment_method: params.paymentMethod,
  payment_status: params.paymentStatus || 'pending',
  created_at: params.createdAt || new Date().toISOString(),
  user_id: params.userId,
  razorpay_order_id: params.razorpayOrderId || '',
  razorpay_payment_id: params.razorpayPaymentId || '',
  razorpay_signature: params.razorpaySignature || '',
  items: params.items.map(item => ({
    id: item.id,
    order_id: params.orderId,
    menu_item_id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  })),
});

const chunkValues = <T,>(values: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
};

const fetchOrderItemsMap = async (orderIds: string[]) => {
  const normalizedOrderIds = Array.from(
    new Set(
      orderIds
        .map(orderId => orderId.trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  const itemsByOrderId = new Map<string, OrderItem[]>();
  if (normalizedOrderIds.length === 0) {
    return itemsByOrderId;
  }

  const orderIdChunks = chunkValues(normalizedOrderIds, ORDER_ITEMS_IN_QUERY_LIMIT);
  await Promise.all(orderIdChunks.map(async orderIdChunk => {
    const orderItemsQuery = query(
      collection(db, 'order_items'),
      where('orderId', 'in', orderIdChunk),
    );
    const orderItemsSnapshot = await getDocs(orderItemsQuery);

    orderItemsSnapshot.docs.forEach(orderItemDoc => {
      const itemData = orderItemDoc.data() as Record<string, unknown>;
      const orderId = ((itemData.orderId as string) || '').trim().toUpperCase();
      if (!orderId) {
        return;
      }

      const mappedOrderItem: OrderItem = {
        id: orderItemDoc.id,
        order_id: orderId,
        menu_item_id: (itemData.itemId as string) || '',
        name: (itemData.name as string) || 'Item',
        quantity: Number(itemData.quantity || 0),
        price: Number(itemData.price || 0),
      };

      const existingItems = itemsByOrderId.get(orderId) || [];
      existingItems.push(mappedOrderItem);
      itemsByOrderId.set(orderId, existingItems);
    });
  }));

  return itemsByOrderId;
};

const SpiceMeter = ({ level }: { level: number }) => {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Flame 
          key={i} 
          size={14} 
          className={i < level ? "text-primary fill-primary" : "text-white/20"} 
        />
      ))}
    </div>
  );
};

const SteamEffect = ({ className = '' }: { className?: string }) => (
  <div className={`pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 items-end gap-2 ${className}`}>
    {[...Array(5)].map((_, i) => (
      <span
        key={i}
        className="auth-steam-particle block rounded-full bg-[linear-gradient(180deg,rgba(255,247,240,0.88),rgba(255,255,255,0.08))] blur-[1.5px]"
        style={{
          width: `${4 + (i % 3)}px`,
          height: `${28 + i * 7}px`,
          animationDelay: `${i * 0.28}s`,
          animationDuration: `${2.35 + i * 0.18}s`,
          ['--steam-drift' as any]: `${(i - 2) * 9}px`,
        }}
      />
    ))}
  </div>
);

const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative isolate min-h-screen overflow-hidden bg-[#120c08] text-[#fffaf5]">
    <div
      className="auth-bg-image absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: AUTH_BACKGROUND_IMAGE }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,214,168,0.2),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(131,76,42,0.32),transparent_34%),linear-gradient(180deg,rgba(17,11,8,0.2),rgba(17,10,7,0.46)_42%,rgba(8,5,4,0.74)_100%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,8,6,0.46),rgba(12,8,6,0.08)_34%,rgba(12,8,6,0.18)_68%,rgba(12,8,6,0.6)_100%)]" />
    <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,244,229,0.9)_1px,transparent_0)] [background-size:22px_22px]" />
    <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-[#b96a2b]/16 blur-[120px]" />
    <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[#ffb366]/10 blur-[140px]" />
    <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </div>
  </div>
);

interface FoodCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, delta: number) => void;
  cartQuantity: number;
}

const FoodCard: React.FC<FoodCardProps> = ({ item, onAdd, cartQuantity }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden group">
        <img 
          src={item.image_url} 
          alt={item.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
          {item.is_veg ? (
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-red-500" />
          )}
          {item.is_veg ? 'Veg' : 'Non-Veg'}
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-accent text-black font-bold rounded-lg text-xs flex items-center gap-1">
          <Star size={12} fill="black" /> {item.rating}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-display font-bold text-lg leading-tight">{item.name}</h3>
        </div>
        <p className="text-ink-muted text-xs mb-3 line-clamp-2">{item.description}</p>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-primary font-bold text-lg">₹{item.price}</span>
            <SpiceMeter level={item.spice_level} />
          </div>
          
          {cartQuantity > 0 ? (
            <div className="flex items-center bg-primary rounded-xl p-1 gap-3">
              <button onClick={() => onAdd(item, -1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <Minus size={16} />
              </button>
              <span className="font-bold min-w-[1.5rem] text-center">{cartQuantity}</span>
              <button onClick={() => onAdd(item, 1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => onAdd(item, 1)}
              className="bg-primary hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus size={18} /> Add to Cart
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const CoffeeFoodCard: React.FC<FoodCardProps> = ({ item, onAdd, cartQuantity }) => {
  return (
    <motion.article
      layout
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="coffee-surface group flex h-full flex-col overflow-hidden rounded-[26px]"
    >
      <div className="relative aspect-[1.06] overflow-hidden">
        <img
          src={item.image_url}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0907]/92 via-[#0d0907]/10 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#120d0b]/82 px-2.5 py-1 text-[11px] font-semibold text-accent shadow-lg backdrop-blur-md">
          {item.is_veg ? <Leaf size={12} className="text-emerald-400" /> : <Flame size={12} className="text-rose-300" />}
          <span>{item.is_veg ? 'Veg' : 'Non-veg'}</span>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/10 bg-[#201612]/82 px-2.5 py-1 text-[11px] font-semibold text-accent backdrop-blur-md">
          <Star size={12} className="fill-current text-highlight" />
          <span>{item.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-[15px] font-semibold leading-snug tracking-[0.01em] text-accent">
              {item.name}
            </h3>
            <div className="coffee-badge shrink-0">
              <Flame size={12} className="text-highlight" />
              <span>{Math.max(0, item.spice_level)}/5</span>
            </div>
          </div>
          <p className="line-clamp-2 text-[12px] leading-5 text-ink-muted/88">{item.description}</p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[#fffaf6]">
              <Coffee size={14} className="text-secondary" />
              <span>{CURRENCY_SYMBOL}{item.price}</span>
            </div>
            <SpiceMeter level={item.spice_level} />
          </div>

          {cartQuantity > 0 ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#120d0b]/92 p-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
              <button
                onClick={() => onAdd(item, -1)}
                className="coffee-icon-btn h-9 w-9 rounded-full border-none bg-white/6"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-5 text-center text-sm font-semibold text-accent">{cartQuantity}</span>
              <button
                onClick={() => onAdd(item, 1)}
                className="coffee-icon-btn h-9 w-9 rounded-full border-none bg-primary text-white hover:text-white"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(item, 1)}
              className="coffee-btn-primary min-w-[108px] px-3.5"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};

const MenuSkeletonCard = () => (
  <div className="coffee-surface overflow-hidden rounded-[26px]">
    <div className="coffee-skeleton aspect-[1.06]" />
    <div className="space-y-3 p-3.5">
      <div className="coffee-skeleton h-4 w-2/3 rounded-full" />
      <div className="coffee-skeleton h-3 w-full rounded-full" />
      <div className="coffee-skeleton h-3 w-4/5 rounded-full" />
      <div className="flex items-center justify-between pt-2">
        <div className="coffee-skeleton h-4 w-16 rounded-full" />
        <div className="coffee-skeleton h-10 w-24 rounded-full" />
      </div>
    </div>
  </div>
);

const BrewingOverlay = ({ visible }: { visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0a0705]/82 px-6 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="coffee-surface w-full max-w-[320px] rounded-[30px] p-6 text-center"
        >
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(255,179,71,0.15),rgba(111,78,55,0.12))]">
            <LoaderCircle size={44} className="coffee-loader-ring absolute text-secondary/80" strokeWidth={1.5} />
            <Coffee size={28} className="relative z-10 text-accent" strokeWidth={1.9} />
          </div>
          <div className="mt-5 flex items-center justify-center gap-1.5 text-highlight">
            {[0, 1, 2, 3].map(bean => (
              <span key={bean} className="coffee-bean block h-2.5 w-2.5 rounded-full bg-current" />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
            <Sparkles size={14} />
            Brewing your order
          </div>
          <h3 className="mt-3 font-display text-[1.35rem] font-semibold text-accent">
            Warming up checkout
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Preparing your cart, payment flow, and confirmation in one smooth pour.
          </p>
          <div className="mt-5 overflow-hidden rounded-full border border-white/10 bg-white/6 p-1">
            <motion.div
              initial={{ x: '-55%' }}
              animate={{ x: '140%' }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2 w-24 rounded-full bg-[linear-gradient(90deg,#ffb347,#f5e6d3)]"
            />
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'offers' | 'orders' | 'tracking' | 'about' | 'contact'>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeliveryAgent, setIsDeliveryAgent] = useState(false);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [newOrderDocIds, setNewOrderDocIds] = useState<string[]>([]);
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [deliverySessions, setDeliverySessions] = useState<DeliverySession[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isUserOrdersLoading, setIsUserOrdersLoading] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<Order | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [isTrackingOrder, setIsTrackingOrder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'success'>('cart');
  const [customerDetails, setCustomerDetails] = useState<CheckoutCustomerDetails>({
    name: '',
    phone: '',
    address: '',
    location: null,
    payment: 'Pay Online',
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileSaved, setProfileSaved] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [profileDraft, setProfileDraft] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [isProfileAddressExpanded, setIsProfileAddressExpanded] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isProfileSavedToastVisible, setIsProfileSavedToastVisible] = useState(false);
  const [isStaffProfileOpen, setIsStaffProfileOpen] = useState(false);
  const [staffProfileSaved, setStaffProfileSaved] = useState<StaffProfile>(EMPTY_STAFF_PROFILE);
  const [staffProfileDraft, setStaffProfileDraft] = useState<StaffProfile>(EMPTY_STAFF_PROFILE);
  const [staffProfileError, setStaffProfileError] = useState('');
  const [isStaffProfileSaving, setIsStaffProfileSaving] = useState(false);
  const [isStaffProfileSavedToastVisible, setIsStaffProfileSavedToastVisible] = useState(false);
  const [isAccessManagementOpen, setIsAccessManagementOpen] = useState(false);
  const [adminAccessEntries, setAdminAccessEntries] = useState<AccessEntry[]>([]);
  const [deliveryAccessEntries, setDeliveryAccessEntries] = useState<AccessEntry[]>([]);
  const [adminAccessInput, setAdminAccessInput] = useState('');
  const [deliveryAccessInput, setDeliveryAccessInput] = useState('');
  const [adminAccessError, setAdminAccessError] = useState('');
  const [deliveryAccessError, setDeliveryAccessError] = useState('');
  const [adminAccessSuccess, setAdminAccessSuccess] = useState('');
  const [deliveryAccessSuccess, setDeliveryAccessSuccess] = useState('');
  const [isAdminAccessSaving, setIsAdminAccessSaving] = useState(false);
  const [isDeliveryAccessSaving, setIsDeliveryAccessSaving] = useState(false);
  const [adminAccessRemovingId, setAdminAccessRemovingId] = useState('');
  const [deliveryAccessRemovingId, setDeliveryAccessRemovingId] = useState('');
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | 'new'>('new');
  const [isCheckoutAddressListOpen, setIsCheckoutAddressListOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
  const [customerLocationError, setCustomerLocationError] = useState('');
  const [draftOrderId, setDraftOrderId] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCouponAppliedPulseVisible, setIsCouponAppliedPulseVisible] = useState(false);
  const previousAdminOrderCountRef = useRef(0);
  const hasInitializedAdminOrdersRef = useRef(false);
  const orderAlertAudioRef = useRef<HTMLAudioElement | null>(null);
  const adminOrdersSnapshotVersionRef = useRef(0);
  const userOrdersSnapshotVersionRef = useRef(0);
  const hasCheckoutAddressSelectionRef = useRef(false);
  const agentTrackerRef = useRef<ReturnType<typeof createAgentTracker> | null>(null);
  const trackedOrderIdRef = useRef('');
  const [isAgentTracking, setIsAgentTracking] = useState(false);
  const [agentPermissionState, setAgentPermissionState] = useState<AgentTrackerPermissionState>('unavailable');
  const [agentTrackerStatus, setAgentTrackerStatus] = useState<AgentTrackerStatus>(DEFAULT_TRACKER_STATUS);
  const [agentLastTrackedLocation, setAgentLastTrackedLocation] = useState<DeliveryLocation | null>(null);

  const normalizedCurrentEmail = currentUserEmail.trim().toLowerCase();
  const isMainAdmin = normalizedCurrentEmail === ADMIN_EMAIL;

  const {
    offers,
    activeOffers,
    isLoading: isOffersLoading,
    error: offersError,
    createOffer,
    updateOffer,
    deleteOffer,
    toggleOfferStatus,
    findActiveOfferByCode,
  } = useOffers({ includeInactive: isAdmin });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        const email = user.email || '';
        setIsLoggedIn(true);
        setCurrentUserId(user.uid);
        setCurrentUserEmail(email);
      } else {
        setIsLoggedIn(false);
        setCurrentUserId('');
        setCurrentUserEmail('');
        setIsAdmin(false);
        setIsDeliveryAgent(false);
        setActiveTab('home');
      }

      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUserEmail) {
      setIsAdmin(false);
      setIsDeliveryAgent(false);
      return;
    }

    const normalizedEmail = currentUserEmail.trim().toLowerCase();
    const adminQuery = query(
      collection(db, 'admin_access'),
      where('email', '==', normalizedEmail),
    );
    const deliveryQuery = query(
      collection(db, 'delivery_agents'),
      where('email', '==', normalizedEmail),
    );

    const unsubscribeAdmin = onSnapshot(
      adminQuery,
      snapshot => {
        setIsAdmin(!snapshot.empty || normalizedEmail === ADMIN_EMAIL);
      },
      error => {
        console.error('Failed to verify admin access', error);
        setIsAdmin(normalizedEmail === ADMIN_EMAIL);
      },
    );

    const unsubscribeDelivery = onSnapshot(
      deliveryQuery,
      snapshot => {
        setIsDeliveryAgent(!snapshot.empty);
      },
      error => {
        console.error('Failed to verify delivery agent access', error);
        setIsDeliveryAgent(false);
      },
    );

    return () => {
      unsubscribeAdmin();
      unsubscribeDelivery();
    };
  }, [currentUserEmail]);

  useEffect(() => {
    if (!isMainAdmin) {
      return;
    }

    void setDoc(
      doc(db, 'admin_access', ADMIN_EMAIL),
      {
        email: ADMIN_EMAIL,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(error => {
      console.error('Failed to seed main admin access', error);
    });
  }, [isMainAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminAccessEntries([]);
      setDeliveryAccessEntries([]);
      return;
    }

    const unsubscribeAdmins = onSnapshot(
      collection(db, 'admin_access'),
      snapshot => {
        const entries = snapshot.docs
          .map(docSnapshot => {
            const data = docSnapshot.data() as Record<string, unknown>;
            const emailValue = ((data.email as string) || docSnapshot.id || '').trim().toLowerCase();
            if (!emailValue) {
              return null;
            }

            return {
              id: docSnapshot.id,
              email: emailValue,
              role: 'admin' as const,
            };
          })
          .filter((entry): entry is AccessEntry => Boolean(entry))
          .sort((a, b) => a.email.localeCompare(b.email));

        setAdminAccessEntries(entries);
      },
      error => {
        console.error('Failed to load admin access list', error);
        setAdminAccessEntries([]);
      },
    );

    const unsubscribeAgents = onSnapshot(
      collection(db, 'delivery_agents'),
      snapshot => {
        const entries = snapshot.docs
          .map(docSnapshot => {
            const data = docSnapshot.data() as Record<string, unknown>;
            const emailValue = ((data.email as string) || '').trim().toLowerCase();
            if (!emailValue) {
              return null;
            }

            return {
              id: docSnapshot.id,
              email: emailValue,
              role: ((data.role as AccessEntry['role']) || 'delivery'),
              accessOnly: data.accessOnly === true,
            };
          })
          .filter((entry): entry is AccessEntry => Boolean(entry))
          .sort((a, b) => a.email.localeCompare(b.email));

        setDeliveryAccessEntries(entries);
      },
      error => {
        console.error('Failed to load delivery access list', error);
        setDeliveryAccessEntries([]);
      },
    );

    return () => {
      unsubscribeAdmins();
      unsubscribeAgents();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!adminAccessSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAdminAccessSuccess('');
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [adminAccessSuccess]);

  useEffect(() => {
    if (!deliveryAccessSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDeliveryAccessSuccess('');
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [deliveryAccessSuccess]);

  useEffect(() => {
    if (!isLoggedIn) {
      setMenu([]);
      setIsMenuLoading(false);
      return;
    }

    setIsMenuLoading(true);
    const menuQuery = collection(db, 'menu_items');
    const unsubscribe = onSnapshot(
      menuQuery,
      snapshot => {
        const firestoreMenuItems = snapshot.docs.map(mapMenuDocToMenuItem).filter(item => item.is_available);
        setMenu(firestoreMenuItems);
        setIsMenuLoading(false);
      },
      error => {
        console.error('Failed to subscribe to menu items', error);
        setIsMenuLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!currentUserId) {
      setUserOrders([]);
      setIsUserOrdersLoading(false);
      userOrdersSnapshotVersionRef.current = 0;
      return;
    }

    setIsUserOrdersLoading(true);
    const buildUserOrdersQuery = (withOrderBy: boolean) => query(
      collection(db, 'orders'),
      where('userId', '==', currentUserId),
      ...(withOrderBy ? [orderBy('createdAt', 'desc')] : []),
    );

    let activeUnsubscribe: (() => void) | null = null;
    let hasFallbackQuery = false;

    const subscribeToUserOrders = (withOrderBy: boolean) => {
      activeUnsubscribe = onSnapshot(
        buildUserOrdersQuery(withOrderBy),
        snapshot => {
          const mappedOrders = snapshot.docs.map(mapOrderDocToOrder);
          const sortedOrders = withOrderBy
            ? mappedOrders
            : [...mappedOrders].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            );

          setUserOrders(sortedOrders);
          setIsUserOrdersLoading(false);

          const snapshotVersion = userOrdersSnapshotVersionRef.current + 1;
          userOrdersSnapshotVersionRef.current = snapshotVersion;

          void (async () => {
            try {
              const orderItemsMap = await fetchOrderItemsMap(sortedOrders.map(order => order.id));
              if (userOrdersSnapshotVersionRef.current !== snapshotVersion) {
                return;
              }

              setUserOrders(sortedOrders.map(order => ({
                ...order,
                items: orderItemsMap.get(order.id) || [],
              })));
            } catch (error) {
              console.error('Failed to load order items for user orders', error);
            }
          })();
        },
        error => {
          const shouldFallback = (
            withOrderBy &&
            !hasFallbackQuery &&
            error instanceof FirebaseError &&
            error.code === 'failed-precondition'
          );

          if (shouldFallback) {
            hasFallbackQuery = true;
            activeUnsubscribe?.();
            subscribeToUserOrders(false);
            return;
          }

          console.error('Failed to subscribe to user orders', error);
          setIsUserOrdersLoading(false);
        },
      );
    };

    subscribeToUserOrders(true);

    return () => {
      activeUnsubscribe?.();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setProfileSaved(EMPTY_PROFILE);
      setProfileDraft(EMPTY_PROFILE);
      setIsProfileAddressExpanded(false);
      setIsProfileSavedToastVisible(false);
      setSelectedAddressIndex('new');
      setIsCheckoutAddressListOpen(false);
      return;
    }

    const userRef = doc(db, 'users', currentUserId);
    const unsubscribe = onSnapshot(
      userRef,
      snapshot => {
        if (!snapshot.exists()) {
          setProfileSaved(EMPTY_PROFILE);
          return;
        }

        setProfileSaved(mapProfileDocToProfile(snapshot.data() as Record<string, unknown>));
      },
      error => {
        console.error('Failed to load customer profile', error);
        setProfileSaved(EMPTY_PROFILE);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!isProfileOpen) {
      setProfileDraft(buildProfileDraft(profileSaved));
      setIsProfileAddressExpanded(false);
    }
  }, [profileSaved, isProfileOpen]);

  useEffect(() => {
    const canAccessStaffProfile = isAdmin || isDeliveryAgent;
    if (!currentUserId || !canAccessStaffProfile) {
      const fallbackRole: StaffRole = isAdmin ? 'admin' : 'agent';
      setStaffProfileSaved({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
      setStaffProfileDraft({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
      setIsStaffProfileSavedToastVisible(false);
      return;
    }

    const fallbackRole: StaffRole = isAdmin ? 'admin' : 'agent';
    const userRef = doc(db, 'users', currentUserId);
    const unsubscribe = onSnapshot(
      userRef,
      snapshot => {
        if (!snapshot.exists()) {
          setStaffProfileSaved({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
          return;
        }

        setStaffProfileSaved(
          mapStaffProfileDocToProfile(snapshot.data() as Record<string, unknown>, fallbackRole),
        );
      },
      error => {
        console.error('Failed to load staff profile', error);
        setStaffProfileSaved({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [currentUserId, isAdmin, isDeliveryAgent]);

  useEffect(() => {
    if (!isStaffProfileOpen) {
      setStaffProfileDraft(buildStaffProfileDraft(staffProfileSaved));
      setStaffProfileError('');
      setIsStaffProfileSavedToastVisible(false);
    }
  }, [staffProfileSaved, isStaffProfileOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (isStaffProfileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isStaffProfileOpen]);

  useEffect(() => {
    const canAccessStaffOrders = isAdmin || isDeliveryAgent;
    if (!canAccessStaffOrders) {
      setAdminOrders([]);
      setNewOrderDocIds([]);
      previousAdminOrderCountRef.current = 0;
      hasInitializedAdminOrdersRef.current = false;
      adminOrdersSnapshotVersionRef.current = 0;
      return;
    }

    if (isAdmin && !orderAlertAudioRef.current) {
      orderAlertAudioRef.current = new Audio('/order-alert.mp3');
      orderAlertAudioRef.current.preload = 'auto';
    }

    if (
      isAdmin &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      void Notification.requestPermission().catch(error => {
        console.error('Notification permission request failed', error);
      });
    }

    const highlightTimeoutIds: number[] = [];
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      ordersQuery,
      snapshot => {
        const mappedOrders = snapshot.docs.map(mapOrderDocToOrder);
        setAdminOrders(mappedOrders);

        const snapshotVersion = adminOrdersSnapshotVersionRef.current + 1;
        adminOrdersSnapshotVersionRef.current = snapshotVersion;

        void (async () => {
          try {
            const orderItemsMap = await fetchOrderItemsMap(mappedOrders.map(order => order.id));
            if (adminOrdersSnapshotVersionRef.current !== snapshotVersion) {
              return;
            }

            setAdminOrders(mappedOrders.map(order => ({
              ...order,
              items: orderItemsMap.get(order.id) || [],
            })));
          } catch (error) {
            console.error('Failed to load order items for admin orders', error);
          }
        })();

        if (!hasInitializedAdminOrdersRef.current) {
          previousAdminOrderCountRef.current = snapshot.size;
          hasInitializedAdminOrdersRef.current = true;
          return;
        }

        if (snapshot.size > previousAdminOrderCountRef.current) {
          const addedOrderDocIds = snapshot
            .docChanges()
            .filter(change => change.type === 'added')
            .map(change => change.doc.id);

          if (isAdmin && addedOrderDocIds.length > 0) {
            setNewOrderDocIds(prev => Array.from(new Set([...addedOrderDocIds, ...prev])));

            const timeoutId = window.setTimeout(() => {
              setNewOrderDocIds(prev => prev.filter(id => !addedOrderDocIds.includes(id)));
            }, 20000);
            highlightTimeoutIds.push(timeoutId);

            if (orderAlertAudioRef.current) {
              orderAlertAudioRef.current.currentTime = 0;
              void orderAlertAudioRef.current.play().catch(error => {
                console.error('Unable to play order alert sound', error);
              });
            }

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('New Order Received', {
                body: 'A new order has been placed.',
                icon: '/logo.png',
              });
            }
          }
        }

        previousAdminOrderCountRef.current = snapshot.size;
      },
      error => {
        console.error('Failed to subscribe to admin orders', error);
      },
    );

    return () => {
      unsubscribe();
      highlightTimeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId));
    };
  }, [isAdmin, isDeliveryAgent]);

  useEffect(() => {
    const shouldSeedDefaultAgent =
      isAdmin || isDeliveryAgent || normalizedCurrentEmail === DELIVERY_AGENT_EMAIL;
    if (!shouldSeedDefaultAgent) {
      return;
    }

    const shouldUseUserDetails = normalizedCurrentEmail === DELIVERY_AGENT_EMAIL;
    const seededAgentName = shouldUseUserDetails
      ? auth.currentUser?.displayName || DEFAULT_DELIVERY_AGENT.name
      : DEFAULT_DELIVERY_AGENT.name;
    const seededAgentPhone = shouldUseUserDetails
      ? auth.currentUser?.phoneNumber || DEFAULT_DELIVERY_AGENT.phone
      : DEFAULT_DELIVERY_AGENT.phone;

    void setDoc(
      doc(db, 'delivery_agents', DEFAULT_DELIVERY_AGENT.id),
      {
        email: DELIVERY_AGENT_EMAIL,
        role: 'delivery',
        isActive: true,
        name: seededAgentName,
        phone: seededAgentPhone,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(error => {
      console.error('Failed to seed delivery agent profile', error);
    });
  }, [isAdmin, isDeliveryAgent, normalizedCurrentEmail]);

  useEffect(() => {
    if (!isAdmin && !isDeliveryAgent) {
      setDeliveryAgents([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'delivery_agents'),
      snapshot => {
        const mappedAgents = snapshot.docs
          .filter(docSnapshot => (docSnapshot.data() as Record<string, unknown>).accessOnly !== true)
          .map(mapDeliveryAgentDocToAgent);
        setDeliveryAgents(mappedAgents);
      },
      error => {
        console.error('Failed to subscribe to delivery agents', error);
        setDeliveryAgents([]);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isAdmin, isDeliveryAgent]);

  useEffect(() => {
    if (!isAdmin && !isDeliveryAgent) {
      setDeliverySessions([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'delivery_sessions'),
      snapshot => {
        const mappedSessions = snapshot.docs.map(mapDeliverySessionDocToSession);
        setDeliverySessions(mappedSessions);
      },
      error => {
        console.error('Failed to subscribe to delivery sessions', error);
        setDeliverySessions([]);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isAdmin, isDeliveryAgent]);

  useEffect(() => {
    return () => {
      agentTrackerRef.current?.stop();
    };
  }, []);

  const handleTrackOrderLookup = () => {
    const orderId = trackingOrderId.trim().toUpperCase();
    if (!orderId) {
      setTrackingError('Enter your order ID to track it.');
      return;
    }

    setTrackingError('');
    setIsTrackingOrder(true);

    const matchedOrder = userOrders.find(order => order.id === orderId);
    if (!matchedOrder) {
      setOrderStatus(null);
      setTrackingError('Order not found. Please check the ID.');
      setIsTrackingOrder(false);
      return;
    }

    setOrderStatus(matchedOrder);
    setTrackingOrderId(matchedOrder.id);
    setIsTrackingOrder(false);
  };

  const handleTrackFromOrder = (order: Order) => {
    setTrackingError('');
    setIsTrackingOrder(false);
    setTrackingOrderId(order.id);
    setOrderStatus(order);
    setActiveTab('tracking');
  };

  useEffect(() => {
    if (!orderStatus) {
      return;
    }

    const syncedOrder = userOrders.find(order => order.id === orderStatus.id);
    if (!syncedOrder) {
      return;
    }

    setOrderStatus(prev => {
      if (!prev || prev.id !== syncedOrder.id) {
        return prev;
      }

      const mergedItems = syncedOrder.items && syncedOrder.items.length > 0
        ? syncedOrder.items
        : prev.items;

      const isSameStatus = prev.status === syncedOrder.status;
      const isSameTotal = prev.total_amount === syncedOrder.total_amount;
      const isSameAddress = prev.address === syncedOrder.address;
      const isSameCustomerLocation =
        prev.customer_location?.lat === syncedOrder.customer_location?.lat &&
        prev.customer_location?.lng === syncedOrder.customer_location?.lng;
      const isSameItemsRef = prev.items === mergedItems;

      if (isSameStatus && isSameTotal && isSameAddress && isSameCustomerLocation && isSameItemsRef) {
        return prev;
      }

      return {
        ...syncedOrder,
        items: mergedItems,
      };
    });
  }, [orderStatus?.id, userOrders]);

  const currentDeliveryAgent = useMemo(
    () => deliveryAgents.find(agent => agent.id === DEFAULT_DELIVERY_AGENT.id) || null,
    [deliveryAgents],
  );

  const currentDeliverySession = useMemo(() => {
    const activeSessions = deliverySessions.filter(session => {
      const sessionOrder = adminOrders.find(order => order.id === session.order_id);
      return Boolean(sessionOrder && sessionOrder.status === 'Out for Delivery' && session.status !== 'completed');
    });

    const matchingSessionByOrder = activeSessions.find(
      session => session.order_id === currentDeliveryAgent?.current_order_id,
    );
    if (matchingSessionByOrder) {
      return matchingSessionByOrder;
    }

    return activeSessions.find(
      session => session.agent_id === DEFAULT_DELIVERY_AGENT.id && session.status !== 'completed',
    ) || null;
  }, [adminOrders, currentDeliveryAgent?.current_order_id, deliverySessions]);

  const currentDeliveryOrder = useMemo(() => {
    const targetOrderId = currentDeliverySession?.order_id || currentDeliveryAgent?.current_order_id;
    if (targetOrderId) {
      return adminOrders.find(order => order.id === targetOrderId) || null;
    }

    return adminOrders.find(
      order => order.delivery_agent_id === DEFAULT_DELIVERY_AGENT.id && order.status === 'Out for Delivery',
    ) || null;
  }, [
    adminOrders,
    currentDeliveryAgent?.current_order_id,
    currentDeliverySession?.order_id,
  ]);

  useEffect(() => {
    if (
      agentTrackerRef.current &&
      trackedOrderIdRef.current &&
      currentDeliveryOrder?.id &&
      currentDeliveryOrder.id !== trackedOrderIdRef.current
    ) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
      setAgentLastTrackedLocation(null);
      return;
    }

    if (!currentDeliveryOrder && agentTrackerRef.current) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
      setAgentLastTrackedLocation(null);
      return;
    }

    if (currentDeliveryOrder?.status === 'Delivered' && agentTrackerRef.current) {
      agentTrackerRef.current.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus({
        lifecycle: 'completed',
        message: 'Delivery completed and GPS tracking stopped.',
      });
    }
  }, [currentDeliveryOrder?.doc_id, currentDeliveryOrder?.status]);

  const applyOrderLocalUpdate = (orderDocId: string, updater: (order: Order) => Order) => {
    setAdminOrders(prev => prev.map(order => (
      order.doc_id === orderDocId ? updater(order) : order
    )));
    setUserOrders(prev => prev.map(order => (
      order.doc_id === orderDocId ? updater(order) : order
    )));
    setOrderStatus(prev => (
      prev && prev.doc_id === orderDocId ? updater(prev) : prev
    ));
  };

  const getCurrentBrowserLocation = () => new Promise<DeliveryLocation>((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? Number(position.coords.accuracy.toFixed(1))
            : undefined,
        });
      },
      error => {
        reject(new Error(error.message || 'Unable to access your location.'));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );
  });

  const captureCustomerLocation = async () => {
    setIsLocatingCustomer(true);
    setCustomerLocationError('');
    setCheckoutError('');

    try {
      const nextLocation = await getCurrentBrowserLocation();
      setCustomerDetails(prev => ({
        ...prev,
        location: nextLocation,
      }));
      return nextLocation;
    } catch (error) {
      console.error('Failed to capture customer location', error);
      setCustomerLocationError(
        error instanceof Error
          ? error.message
          : 'Unable to capture your location right now.',
      );
      return null;
    } finally {
      setIsLocatingCustomer(false);
    }
  };

  const handleCaptureCustomerLocation = async () => {
    await captureCustomerLocation();
  };

  const toFirestoreLocation = (location: DeliveryLocation) => ({
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy ?? null,
  });

  const markOrderDelivered = async (order: Order, finalLocation?: DeliveryLocation | null) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', order.doc_id), {
      status: 'Delivered',
      deliveredAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'delivery_sessions', order.id),
      {
        agentId: order.delivery_agent_id || '',
        agentName: order.delivery_agent_name || '',
        completedAt: serverTimestamp(),
        lastLocation: finalLocation
          ? {
              ...toFirestoreLocation(finalLocation),
              updatedAt: serverTimestamp(),
            }
          : null,
        orderDocId: order.doc_id,
        orderId: order.id,
        status: 'completed',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    if (finalLocation) {
      batch.set(
        doc(db, 'agent_locations', order.id),
        {
          agentId: order.delivery_agent_id || '',
          ...toFirestoreLocation(finalLocation),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (order.delivery_agent_id) {
      batch.set(
        doc(db, 'delivery_agents', order.delivery_agent_id),
        {
          currentOrderId: '',
          ...(finalLocation
            ? {
                lastLocation: {
                  ...toFirestoreLocation(finalLocation),
                  updatedAt: serverTimestamp(),
                },
              }
            : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();

    applyOrderLocalUpdate(order.doc_id, currentOrder => ({
      ...currentOrder,
      status: 'Delivered',
    }));
  };

  const handleStartDelivery = async () => {
    if (!currentDeliveryOrder?.customer_location) {
      alert('This order is missing customer coordinates, so live delivery cannot start.');
      return;
    }

    const agentId = currentDeliveryAgent?.id || DEFAULT_DELIVERY_AGENT.id;
    agentTrackerRef.current?.stop();

    const tracker = createAgentTracker({
      agentId,
      onError: message => {
        console.error('Agent tracker error', message);
      },
      onLocation: location => {
        setAgentLastTrackedLocation(location);
      },
      onPermissionChange: permissionState => {
        setAgentPermissionState(permissionState);
      },
      onStatusChange: status => {
        setAgentTrackerStatus(status);
        setIsAgentTracking(status.lifecycle === 'starting' || status.lifecycle === 'watching' || status.lifecycle === 'restarting');
      },
      orderDocId: currentDeliveryOrder.doc_id,
      orderId: currentDeliveryOrder.id,
    });

    agentTrackerRef.current = tracker;
    const didStart = await tracker.start();
    if (!didStart) {
      setIsAgentTracking(false);
      return;
    }

    trackedOrderIdRef.current = currentDeliveryOrder.id;

    await setDoc(
      doc(db, 'delivery_sessions', currentDeliveryOrder.id),
      {
        agentId,
        agentName: currentDeliveryAgent?.name || DEFAULT_DELIVERY_AGENT.name,
        orderDocId: currentDeliveryOrder.doc_id,
        orderId: currentDeliveryOrder.id,
        startedAt: serverTimestamp(),
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const handleEndDelivery = async (orderDocId: string) => {
    const orderToComplete =
      adminOrders.find(order => order.doc_id === orderDocId) ||
      userOrders.find(order => order.doc_id === orderDocId) ||
      (orderStatus?.doc_id === orderDocId ? orderStatus : null);

    if (!orderToComplete) {
      alert('Unable to find the order for this delivery.');
      return;
    }

    const finalLocation = agentLastTrackedLocation;

    try {
      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      await markOrderDelivered(orderToComplete, finalLocation);
      setAgentTrackerStatus({
        lifecycle: 'completed',
        message: 'Delivery ended and the order is marked as delivered.',
      });
    } catch (error) {
      console.error('Failed to end delivery', error);
      alert('Unable to end this delivery right now.');
    }
  };

  const updateOrderStatus = async (orderDocId: string, status: Order['status']) => {
    const normalizedStatus = normalizeOrderStatus(status);
    const existingOrder =
      adminOrders.find(order => order.doc_id === orderDocId) ||
      userOrders.find(order => order.doc_id === orderDocId) ||
      (orderStatus?.doc_id === orderDocId ? orderStatus : null);

    if (!existingOrder) {
      alert('Unable to find the order for this update.');
      return;
    }

    if (normalizedStatus === 'Out for Delivery') {
      alert('Use Assign & Dispatch to start delivery tracking for this order.');
      return;
    }

    if (normalizedStatus === 'Delivered') {
      try {
        agentTrackerRef.current?.stop();
        agentTrackerRef.current = null;
        trackedOrderIdRef.current = '';
        setIsAgentTracking(false);
        await markOrderDelivered(existingOrder, agentLastTrackedLocation);
      } catch (error) {
        console.error('Failed to complete delivery', error);
        alert('Unable to mark this order as delivered right now.');
      }
      return;
    }

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'orders', orderDocId), {
        status: normalizedStatus,
        deliveryAgentId: deleteField(),
        deliveryAgentName: deleteField(),
        deliveryAgentPhone: deleteField(),
        deliveryAssignedAt: deleteField(),
      });

      if (existingOrder.delivery_agent_id) {
        batch.set(
          doc(db, 'delivery_agents', existingOrder.delivery_agent_id),
          {
            currentOrderId: '',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();

      applyOrderLocalUpdate(orderDocId, order => ({
        ...order,
        status: normalizedStatus,
        delivery_agent_id: '',
        delivery_agent_name: '',
        delivery_agent_phone: '',
        delivery_assigned_at: '',
      }));
      setNewOrderDocIds(prev => prev.filter(id => id !== orderDocId));
    } catch (error) {
      console.error('Failed to update order status', error);
      alert('Unable to update order status right now.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google sign-in failed', error);
      alert('Unable to sign in with Google right now.');
    }
  };

  const handleLogout = async () => {
    try {
      agentTrackerRef.current?.stop();
      agentTrackerRef.current = null;
      trackedOrderIdRef.current = '';
      setIsAgentTracking(false);
      setAgentTrackerStatus(DEFAULT_TRACKER_STATUS);
      setAgentLastTrackedLocation(null);
      await signOut(auth);
      setActiveTab('home');
    } catch (error) {
      console.error('Logout failed', error);
      alert('Unable to log out right now.');
    }
  };

  const handleOpenProfile = () => {
    setProfileDraft(buildProfileDraft(profileSaved));
    setIsProfileAddressExpanded(false);
    setProfileError('');
    setIsProfileSavedToastVisible(false);
    setIsProfileOpen(true);
    setIsCartOpen(false);
  };

  const handleCloseProfile = () => {
    setIsProfileOpen(false);
    setProfileError('');
    setIsProfileSavedToastVisible(false);
  };

  const handleOpenStaffProfile = () => {
    const role: StaffRole = isAdmin ? 'admin' : 'agent';
    const seededEmail = staffProfileSaved.email || currentUserEmail;
    setStaffProfileDraft(buildStaffProfileDraft({
      ...staffProfileSaved,
      role,
      email: seededEmail,
    }));
    setStaffProfileError('');
    setIsStaffProfileSavedToastVisible(false);
    setIsAccessManagementOpen(false);
    setAdminAccessError('');
    setDeliveryAccessError('');
    setAdminAccessSuccess('');
    setDeliveryAccessSuccess('');
    setIsStaffProfileOpen(true);
  };

  const handleCloseStaffProfile = () => {
    setIsStaffProfileOpen(false);
    setStaffProfileError('');
    setIsStaffProfileSavedToastVisible(false);
    setIsAccessManagementOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!currentUserId) {
      setProfileError('Please sign in to save your profile.');
      return;
    }

    setIsProfileSaving(true);
    setProfileError('');
    try {
      const trimmedAddresses = ensureProfileAddresses(profileDraft.addresses).map(address => address.trim());
      await setDoc(
        doc(db, 'users', currentUserId),
        {
          name: profileDraft.name.trim(),
          phone: formatPhoneWithPrefix(profileDraft.phone),
          email: profileDraft.email.trim(),
          addresses: {
            address1: trimmedAddresses[0] || '',
            address2: trimmedAddresses[1] || '',
            address3: trimmedAddresses[2] || '',
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setIsProfileSavedToastVisible(true);
    } catch (error) {
      console.error('Failed to save customer profile', error);
      setProfileError('Unable to save profile right now.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleSaveStaffProfile = async () => {
    if (!currentUserId) {
      setStaffProfileError('Please sign in to save your profile.');
      return;
    }

    const role: StaffRole = isAdmin ? 'admin' : 'agent';
    setIsStaffProfileSaving(true);
    setStaffProfileError('');
    try {
      const payload: Record<string, unknown> = {
        role,
        name: staffProfileDraft.name.trim(),
        phone: formatPhoneWithPrefix(staffProfileDraft.phone),
        email: staffProfileDraft.email.trim(),
        updatedAt: serverTimestamp(),
      };

      if (role === 'admin') {
        payload.adminLocation = staffProfileDraft.adminLocation.trim();
      }

      if (role === 'agent') {
        payload.vehicleType = staffProfileDraft.vehicleType;
        payload.status = staffProfileDraft.status;
      }

      await setDoc(doc(db, 'users', currentUserId), payload, { merge: true });
      setIsStaffProfileSavedToastVisible(true);
    } catch (error) {
      console.error('Failed to save staff profile', error);
      setStaffProfileError('Unable to save profile right now.');
    } finally {
      setIsStaffProfileSaving(false);
    }
  };

  const normalizeAccessEmail = (value: string) => value.trim().toLowerCase();

  const validateAccessEmail = (email: string) => {
    if (!email) {
      return 'Enter an email address.';
    }

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      return 'Enter a valid email address.';
    }

    return '';
  };

  const handleAddAdminAccess = async () => {
    if (!isMainAdmin) {
      setAdminAccessError('Only the main admin can add new admins.');
      return;
    }

    const normalizedEmail = normalizeAccessEmail(adminAccessInput);
    const validationError = validateAccessEmail(normalizedEmail);
    if (validationError) {
      setAdminAccessError(validationError);
      return;
    }

    if (adminAccessEntries.some(entry => entry.email === normalizedEmail)) {
      setAdminAccessError('This admin already has access.');
      return;
    }

    setIsAdminAccessSaving(true);
    setAdminAccessError('');
    setAdminAccessSuccess('');
    try {
      await setDoc(
        doc(db, 'admin_access', normalizedEmail),
        {
          email: normalizedEmail,
          role: 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setAdminAccessInput('');
      setAdminAccessSuccess('Admin access added.');
    } catch (error) {
      console.error('Failed to add admin access', error);
      setAdminAccessError('Unable to add admin right now.');
    } finally {
      setIsAdminAccessSaving(false);
    }
  };

  const handleRemoveAdminAccess = async (entry: AccessEntry) => {
    if (!isMainAdmin) {
      setAdminAccessError('Only the main admin can remove admins.');
      return;
    }

    if (entry.email === ADMIN_EMAIL) {
      setAdminAccessError('Main admin access cannot be removed.');
      return;
    }

    setAdminAccessRemovingId(entry.id);
    setAdminAccessError('');
    setAdminAccessSuccess('');
    try {
      await deleteDoc(doc(db, 'admin_access', entry.id));
      setAdminAccessSuccess('Admin access removed.');
    } catch (error) {
      console.error('Failed to remove admin access', error);
      setAdminAccessError('Unable to remove admin right now.');
    } finally {
      setAdminAccessRemovingId('');
    }
  };

  const handleAddDeliveryAccess = async () => {
    if (!isMainAdmin) {
      setDeliveryAccessError('Only the main admin can add delivery agents.');
      return;
    }

    const normalizedEmail = normalizeAccessEmail(deliveryAccessInput);
    const validationError = validateAccessEmail(normalizedEmail);
    if (validationError) {
      setDeliveryAccessError(validationError);
      return;
    }

    if (deliveryAccessEntries.some(entry => entry.email === normalizedEmail)) {
      setDeliveryAccessError('This delivery agent already has access.');
      return;
    }

    setIsDeliveryAccessSaving(true);
    setDeliveryAccessError('');
    setDeliveryAccessSuccess('');
    try {
      await setDoc(
        doc(db, 'delivery_agents', normalizedEmail),
        {
          email: normalizedEmail,
          role: 'delivery',
          accessOnly: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setDeliveryAccessInput('');
      setDeliveryAccessSuccess('Delivery agent access added.');
    } catch (error) {
      console.error('Failed to add delivery agent access', error);
      setDeliveryAccessError('Unable to add delivery agent right now.');
    } finally {
      setIsDeliveryAccessSaving(false);
    }
  };

  const handleRemoveDeliveryAccess = async (entry: AccessEntry) => {
    if (!isMainAdmin) {
      setDeliveryAccessError('Only the main admin can remove delivery agents.');
      return;
    }

    if (entry.email === DELIVERY_AGENT_EMAIL || entry.id === DEFAULT_DELIVERY_AGENT.id) {
      setDeliveryAccessError('Default delivery agent access cannot be removed.');
      return;
    }

    setDeliveryAccessRemovingId(entry.id);
    setDeliveryAccessError('');
    setDeliveryAccessSuccess('');
    try {
      await deleteDoc(doc(db, 'delivery_agents', entry.id));
      setDeliveryAccessSuccess('Delivery agent access removed.');
    } catch (error) {
      console.error('Failed to remove delivery agent access', error);
      setDeliveryAccessError('Unable to remove delivery agent right now.');
    } finally {
      setDeliveryAccessRemovingId('');
    }
  };

  const renderStaffProfileDrawer = () => {
    if (!isAdmin && !isDeliveryAgent) {
      return null;
    }

    const profileTitle = isAdmin ? 'Admin Profile' : 'Agent Profile';
    const profileSubtitle = isAdmin ? 'Coffee Hub Management' : 'Delivery operations';
    const nameLabel = isAdmin ? 'Name' : 'Agent Name';
    const staffDrawerScrollClass = isAccessManagementOpen ? 'overflow-hidden' : 'overflow-y-auto';

    return (
      <AnimatePresence>
        {isStaffProfileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseStaffProfile}
              className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 left-0 right-0 z-[90] h-screen"
            >
              <div
                className={`relative ml-auto flex h-screen w-full max-w-md flex-col ${staffDrawerScrollClass} border-l border-white/10 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] shadow-[0_0_60px_rgba(0,0,0,0.45)]`}
                style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth', height: '100vh' }}
              >
                <div className="border-b border-white/6 px-5 pb-4 pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
                        {profileTitle}
                      </p>
                      <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">{profileSubtitle}</h2>
                    </div>
                    <button onClick={handleCloseStaffProfile} className="coffee-icon-btn">
                      <X size={18} />
                    </button>
                  </div>
                </div>

              <AnimatePresence>
                {isStaffProfileSavedToastVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pt-4"
                  >
                    <div className="flex items-center gap-2 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 size={14} />
                      Profile Saved Successfully
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-5 px-5 pb-6 pt-4">
                <div className="coffee-surface-soft rounded-[26px] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                    Profile Information
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        {nameLabel}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="text"
                          className="coffee-input pl-10"
                          value={staffProfileDraft.name}
                          onChange={event => setStaffProfileDraft(prev => ({ ...prev, name: event.target.value }))}
                          placeholder={isAdmin ? 'Admin name' : 'Agent name'}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">
                          +91
                        </span>
                        <input
                          type="tel"
                          className="coffee-input pl-16"
                          value={staffProfileDraft.phone}
                          onChange={event => setStaffProfileDraft(prev => ({ ...prev, phone: event.target.value }))}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Email (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="email"
                          className="coffee-input pl-10"
                          value={staffProfileDraft.email}
                          onChange={event => setStaffProfileDraft(prev => ({ ...prev, email: event.target.value }))}
                          placeholder="name@email.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="coffee-surface-soft rounded-[26px] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                      Admin Details
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Admin Role
                        </label>
                        <div className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-ink">
                          <ShieldCheck size={16} className="text-secondary" />
                          Admin &ndash; Coffee Hub Management
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Admin Location (Optional)
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <input
                            type="text"
                            className="coffee-input pl-10"
                            value={staffProfileDraft.adminLocation}
                            onChange={event => setStaffProfileDraft(prev => ({ ...prev, adminLocation: event.target.value }))}
                            placeholder="Coffee Hub Inkollu"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDeliveryAgent && (
                  <div className="coffee-surface-soft rounded-[26px] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                      Agent Details
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Vehicle Type (Optional)
                        </label>
                        <div className="relative">
                          <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <select
                            className="coffee-input pl-10 pr-10"
                            value={staffProfileDraft.vehicleType}
                            onChange={event => setStaffProfileDraft(prev => ({
                              ...prev,
                              vehicleType: event.target.value as AgentVehicleType,
                            }))}
                          >
                            <option value="">Select vehicle</option>
                            <option value="Bike">Bike</option>
                            <option value="Scooter">Scooter</option>
                            <option value="Cycle">Cycle</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                          Agent Status
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['Available', 'Offline'] as AgentStatus[]).map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setStaffProfileDraft(prev => ({ ...prev, status }))}
                              className={`rounded-2xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                                staffProfileDraft.status === status
                                  ? 'border-secondary/40 bg-[linear-gradient(135deg,rgba(111,78,55,0.6),rgba(62,39,35,0.92))] text-accent shadow-[0_10px_24px_rgba(62,39,35,0.24)]'
                                  : 'border-white/10 bg-white/5 text-ink-muted hover:bg-white/8'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {staffProfileError && (
                  <div className="rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                    {staffProfileError}
                  </div>
                )}
              </div>

              <div className="border-t border-white/6 bg-[#0f0b09]/94 px-5 pt-4 pb-20">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsAccessManagementOpen(true);
                      setAdminAccessError('');
                      setDeliveryAccessError('');
                      setAdminAccessSuccess('');
                      setDeliveryAccessSuccess('');
                    }}
                    className="coffee-btn-secondary mb-3 w-full justify-center"
                  >
                    <ShieldCheck size={16} />
                    Management
                  </button>
                )}
                <button
                  onClick={() => void handleSaveStaffProfile()}
                  disabled={isStaffProfileSaving}
                  className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                >
                  {isStaffProfileSaving ? 'Saving profile...' : 'Save Profile'}
                </button>
                <button
                  onClick={() => {
                    handleCloseStaffProfile();
                    void handleLogout();
                  }}
                  className="coffee-btn-secondary mt-3 w-full justify-center"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>

              <AnimatePresence>
                {isAccessManagementOpen && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0.2 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                    className="absolute inset-0 z-20 flex h-full flex-col overflow-y-auto bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))]"
                  >
                    <div className="border-b border-white/6 px-5 pb-4 pt-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
                            Admin Access Management
                          </p>
                          <h2 className="mt-1 text-[1.4rem] font-semibold text-accent">
                            Manage access roles
                          </h2>
                        </div>
                        <button
                          onClick={() => setIsAccessManagementOpen(false)}
                          className="coffee-icon-btn"
                          aria-label="Back"
                        >
                          <ChevronRight size={18} className="rotate-180" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5 px-5 pb-6 pt-4">
                      <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-ink-muted">
                        {isMainAdmin
                          ? 'You can add or remove admin and delivery agent access.'
                          : 'View only. Only the main admin can update access.'}
                      </div>

                      <div className="coffee-surface-soft rounded-[26px] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                          Admins
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-accent">Admin Management</h3>
                        <div className="mt-4 space-y-2">
                          {adminAccessEntries.length === 0 ? (
                            <p className="text-sm text-ink-muted">No admins added yet.</p>
                          ) : (
                            adminAccessEntries.map(entry => {
                              const isProtected = entry.email === ADMIN_EMAIL;
                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                                >
                                  <span className="text-sm font-semibold text-accent break-all">
                                    {entry.email}
                                  </span>
                                  {isMainAdmin ? (
                                    <button
                                      onClick={() => void handleRemoveAdminAccess(entry)}
                                      disabled={isProtected || adminAccessRemovingId === entry.id}
                                      className="rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {isProtected
                                        ? 'Main'
                                        : adminAccessRemovingId === entry.id
                                          ? 'Removing'
                                          : 'Remove'}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                                      View only
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                        {adminAccessError && (
                          <div className="mt-3 rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                            {adminAccessError}
                          </div>
                        )}
                        {adminAccessSuccess && (
                          <div className="mt-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                            {adminAccessSuccess}
                          </div>
                        )}
                        <div className="mt-4 flex flex-col gap-2">
                          <input
                            type="email"
                            className="coffee-input"
                            placeholder="Add Admin Email"
                            value={adminAccessInput}
                            onChange={event => {
                              setAdminAccessInput(event.target.value);
                              if (adminAccessError) {
                                setAdminAccessError('');
                              }
                              if (adminAccessSuccess) {
                                setAdminAccessSuccess('');
                              }
                            }}
                            disabled={!isMainAdmin || isAdminAccessSaving}
                          />
                          <button
                            onClick={() => void handleAddAdminAccess()}
                            disabled={!isMainAdmin || isAdminAccessSaving}
                            className="coffee-btn-primary w-full justify-center disabled:opacity-60"
                          >
                            {isAdminAccessSaving ? 'Adding...' : 'Add Admin'}
                          </button>
                        </div>
                      </div>

                      <div className="coffee-surface-soft rounded-[26px] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                          Delivery Agents
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-accent">
                          Delivery Agent Management
                        </h3>
                        <div className="mt-4 space-y-2">
                          {deliveryAccessEntries.length === 0 ? (
                            <p className="text-sm text-ink-muted">No delivery agents added yet.</p>
                          ) : (
                            deliveryAccessEntries.map(entry => {
                              const isProtected = entry.email === DELIVERY_AGENT_EMAIL || entry.id === DEFAULT_DELIVERY_AGENT.id;
                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                                >
                                  <span className="text-sm font-semibold text-accent break-all">
                                    {entry.email}
                                  </span>
                                  {isMainAdmin ? (
                                    <button
                                      onClick={() => void handleRemoveDeliveryAccess(entry)}
                                      disabled={isProtected || deliveryAccessRemovingId === entry.id}
                                      className="rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {isProtected
                                        ? 'Default'
                                        : deliveryAccessRemovingId === entry.id
                                          ? 'Removing'
                                          : 'Remove'}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                                      View only
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                        {deliveryAccessError && (
                          <div className="mt-3 rounded-[18px] border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                            {deliveryAccessError}
                          </div>
                        )}
                        {deliveryAccessSuccess && (
                          <div className="mt-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                            {deliveryAccessSuccess}
                          </div>
                        )}
                        <div className="mt-4 flex flex-col gap-2">
                          <input
                            type="email"
                            className="coffee-input"
                            placeholder="Add Delivery Agent"
                            value={deliveryAccessInput}
                            onChange={event => {
                              setDeliveryAccessInput(event.target.value);
                              if (deliveryAccessError) {
                                setDeliveryAccessError('');
                              }
                              if (deliveryAccessSuccess) {
                                setDeliveryAccessSuccess('');
                              }
                            }}
                            disabled={!isMainAdmin || isDeliveryAccessSaving}
                          />
                          <button
                            onClick={() => void handleAddDeliveryAccess()}
                            disabled={!isMainAdmin || isDeliveryAccessSaving}
                            className="coffee-btn-primary w-full justify-center disabled:opacity-60"
                          >
                            {isDeliveryAccessSaving ? 'Adding...' : 'Add Delivery Agent'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  const categories = useMemo(() => ['All', ...new Set(menu.map(item => item.category))], [menu]);

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menu, searchQuery, selectedCategory]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const hasCartItems = cart.length > 0;
  const savedAddressOptions = useMemo(
    () => profileSaved.addresses
      .map((address, index) => ({
        index,
        label: `Address ${index + 1}`,
        value: address.trim(),
      }))
      .filter(option => option.value),
    [profileSaved.addresses],
  );
  const primaryAddressOption = savedAddressOptions.find(option => option.index === 0) || savedAddressOptions[0] || null;
  const selectedAddressLabel = selectedAddressIndex === 'new'
    ? 'New Address'
    : selectedAddressIndex === 0
      ? 'Primary Address'
      : `Address ${selectedAddressIndex + 1}`;
  const selectedSavedAddress = typeof selectedAddressIndex === 'number'
    ? (profileSaved.addresses[selectedAddressIndex] || '')
    : '';
  const checkoutAddressSummary = selectedAddressIndex === 'new'
    ? customerDetails.address
    : selectedSavedAddress || customerDetails.address || primaryAddressOption?.value || '';

  useEffect(() => {
    if (!savedAddressOptions.length) {
      setSelectedAddressIndex('new');
      setIsCheckoutAddressListOpen(false);
      hasCheckoutAddressSelectionRef.current = false;
      return;
    }

    if (!hasCheckoutAddressSelectionRef.current) {
      setSelectedAddressIndex(savedAddressOptions[0].index);
      return;
    }

    setSelectedAddressIndex(prev => {
      if (prev === 'new') {
        return prev;
      }
      const stillExists = savedAddressOptions.some(option => option.index === prev);
      return stillExists ? prev : savedAddressOptions[0].index;
    });
  }, [savedAddressOptions]);

  useEffect(() => {
    if (selectedAddressIndex === 'new') {
      return;
    }

    const selectedAddress = profileSaved.addresses[selectedAddressIndex] || '';
    setCustomerDetails(prev => (
      prev.address === selectedAddress ? prev : { ...prev, address: selectedAddress }
    ));
  }, [selectedAddressIndex, profileSaved.addresses]);

  useEffect(() => {
    if (!profileSaved.name && !profileSaved.phone) {
      return;
    }

    setCustomerDetails(prev => ({
      ...prev,
      name: prev.name || profileSaved.name,
      phone: prev.phone || profileSaved.phone,
    }));
  }, [profileSaved.name, profileSaved.phone]);

  useEffect(() => {
    if (!isProfileSavedToastVisible) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsProfileSavedToastVisible(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isProfileSavedToastVisible]);
  const cartQuantityById = useMemo(
    () => new Map(cart.map(item => [item.id, item.quantity])),
    [cart],
  );
  const appliedOffer = useMemo(
    () => activeOffers.find(offer => offer.couponCode === appliedCouponCode) || null,
    [activeOffers, appliedCouponCode],
  );
  const { discount: discountAmount, finalTotal: finalCartTotal } = useMemo(() => {
    if (!appliedOffer || cartTotal < appliedOffer.minOrderAmount) {
      return { discount: 0, finalTotal: cartTotal };
    }

    return calculateDiscount(cartTotal, appliedOffer);
  }, [appliedOffer, cartTotal]);
  const deliveryFee = useMemo(() => {
    if (!hasCartItems) {
      return 0;
    }

    return STANDARD_DELIVERY_FEE;
  }, [hasCartItems]);
  const payableCartTotal = useMemo(
    () => Number((finalCartTotal + deliveryFee).toFixed(2)),
    [deliveryFee, finalCartTotal],
  );
  const isPayOnlineSelected = customerDetails.payment === 'Pay Online';
  const checkoutPrimaryActionLabel = isPlacingOrder
    ? (isPayOnlineSelected ? 'Opening payment...' : 'Placing order...')
    : (isPayOnlineSelected ? 'Pay online' : 'Confirm order');

  useEffect(() => {
    if (!appliedCouponCode) {
      return;
    }

    if (!appliedOffer) {
      setAppliedCouponCode('');
      setCouponSuccess('');
      setCouponError('Coupon is no longer active.');
      return;
    }

    if (cartTotal < appliedOffer.minOrderAmount) {
      setAppliedCouponCode('');
      setCouponSuccess('');
      setCouponError(`Coupon removed. Minimum order is ₹${appliedOffer.minOrderAmount}.`);
    }
  }, [appliedCouponCode, appliedOffer, cartTotal]);

  useEffect(() => {
    if (cart.length > 0) {
      return;
    }

    setAppliedCouponCode('');
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
  }, [cart.length]);

  useEffect(() => {
    if (cart.length > 0 || checkoutStep === 'success') {
      return;
    }

    setCheckoutStep('cart');
    setDraftOrderId('');
    setCheckoutError('');
  }, [cart.length, checkoutStep]);

  useEffect(() => {
    if (!isCouponAppliedPulseVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsCouponAppliedPulseVisible(false);
    }, 650);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCouponAppliedPulseVisible]);

  useEffect(() => {
    if (checkoutStep !== 'success' || !orderStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsCartOpen(false);
      setCheckoutStep('cart');
      setActiveTab('tracking');
      setDraftOrderId('');
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [checkoutStep, orderStatus]);

  const handleAddToCart = (item: MenuItem, delta: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter(i => i.id !== item.id);
        return prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i);
      }
      if (delta > 0) return [...prev, { ...item, quantity: 1 }];
      return prev;
    });
  };
  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleBrowseMenu = () => {
    setActiveTab('menu');
    setIsCartOpen(false);
    setCheckoutStep('cart');
    setCheckoutError('');
    setDraftOrderId('');

    window.setTimeout(() => {
      const menuSection = document.getElementById('menu-section');
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleApplyCoupon = async () => {
    const normalizedCouponCode = couponInput.trim().toUpperCase();
    if (!normalizedCouponCode) {
      setCouponError('Enter a coupon code.');
      setCouponSuccess('');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const matchingOffer = await findActiveOfferByCode(normalizedCouponCode);
      if (!matchingOffer) {
        setAppliedCouponCode('');
        setCouponError('Invalid coupon code.');
        return;
      }

      if (cartTotal < matchingOffer.minOrderAmount) {
        setAppliedCouponCode('');
        setCouponError(`Minimum order amount is ₹${matchingOffer.minOrderAmount}.`);
        return;
      }

      const { discount } = calculateDiscount(cartTotal, matchingOffer);
      if (discount <= 0) {
        setAppliedCouponCode('');
        setCouponError('Coupon is not applicable for this cart total.');
        return;
      }

      setAppliedCouponCode(matchingOffer.couponCode);
      setCouponInput(matchingOffer.couponCode);
      setCouponSuccess(`Coupon ${matchingOffer.couponCode} applied.`);
      setIsCouponAppliedPulseVisible(true);
    } catch (error) {
      console.error('Failed to apply coupon', error);
      setCouponError('Unable to apply coupon right now.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode('');
    setCouponError('');
    setCouponSuccess('');
  };

  const getNextOrderId = async () => {
    const counterRef = doc(db, 'meta', 'orderCounter');
    const nextNumber = await runTransaction(db, async transaction => {
      const counterSnapshot = await transaction.get(counterRef);
      const currentValue = counterSnapshot.exists() && typeof counterSnapshot.data().nextOrderNumber === 'number'
        ? counterSnapshot.data().nextOrderNumber
        : 1001;

      transaction.set(counterRef, { nextOrderNumber: currentValue + 1 }, { merge: true });
      return currentValue;
    });

    return `COF${String(nextNumber).padStart(4, '0')}`;
  };

  const resetCheckoutAfterSuccess = (nextOrder: Order) => {
    setOrderStatus(nextOrder);
    setTrackingOrderId(nextOrder.id);
    setCheckoutStep('success');
    setCart([]);
    setDraftOrderId('');
    setAppliedCouponCode('');
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
    setCheckoutError('');
  };

  const buildCheckoutDraft = async () => {
    const name = customerDetails.name.trim();
    const phone = customerDetails.phone.trim();
    const address = customerDetails.address.trim();
    let customerLocation = customerDetails.location;

    if (!name || !phone || !address) {
      setCheckoutError('Please fill in your name, phone number, and delivery address.');
      return null;
    }

    if (!customerLocation) {
      const capturedLocation = await captureCustomerLocation();
      if (!capturedLocation) {
        setCheckoutError('Share your live delivery location to enable rider tracking and ETA updates.');
        return null;
      }
      customerLocation = capturedLocation;
    }

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return null;
    }

    if (!currentUserId) {
      setCheckoutError('Please sign in with Google to place an order.');
      return null;
    }

    const subtotalValue = cartTotal;
    const deliveryFeeValue = hasCartItems ? STANDARD_DELIVERY_FEE : 0;
    let discountValue = 0;
    let discountedSubtotalValue = subtotalValue;
    let couponCodeValue = '';

    if (appliedCouponCode) {
      const matchingOffer = await findActiveOfferByCode(appliedCouponCode);
      if (matchingOffer && subtotalValue >= matchingOffer.minOrderAmount) {
        const recalculated = calculateDiscount(subtotalValue, matchingOffer);
        discountValue = recalculated.discount;
        discountedSubtotalValue = recalculated.finalTotal;
        couponCodeValue = matchingOffer.couponCode;
      } else {
        setAppliedCouponCode('');
        setCouponSuccess('');
        setCouponError('Coupon was removed because it is no longer valid.');
      }
    }

    const finalTotalValue = Number((discountedSubtotalValue + deliveryFeeValue).toFixed(2));
    const orderId = draftOrderId || await getNextOrderId();
    setDraftOrderId(orderId);

    const items: CheckoutOrderItemPayload[] = cart.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      order: {
        orderId,
        customer: {
          name,
          phone,
          address,
          location: customerLocation,
        },
        items,
        subtotal: subtotalValue,
        discount: discountValue,
        deliveryFee: deliveryFeeValue,
        couponCode: couponCodeValue,
        finalTotal: finalTotalValue,
      } satisfies CheckoutOrderDraft,
      items,
    };
  };

  const placeCashOnDeliveryOrder = async (draft: CheckoutOrderDraft) => {
    setIsPlacingOrder(true);
    setCheckoutError('');

    try {
      const orderRef = doc(collection(db, 'orders'));
      const batch = writeBatch(db);

      batch.set(orderRef, {
        orderId: draft.orderId,
        userId: currentUserId,
        name: draft.customer.name,
        phone: draft.customer.phone,
        address: draft.customer.address,
        customerLocation: draft.customer.location,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'pending',
        status: 'Pending',
        subtotal: draft.subtotal,
        discount: draft.discount,
        deliveryFee: draft.deliveryFee,
        couponCode: draft.couponCode,
        finalTotal: draft.finalTotal,
        total: draft.finalTotal,
        createdAt: serverTimestamp(),
      });

      for (const item of draft.items) {
        const orderItemRef = doc(collection(db, 'order_items'));
        batch.set(orderItemRef, {
          orderId: draft.orderId,
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        });
      }

      await batch.commit();

      resetCheckoutAfterSuccess(buildLocalOrderState({
        docId: orderRef.id,
        orderId: draft.orderId,
        customer: draft.customer,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'pending',
        userId: currentUserId,
        subtotal: draft.subtotal,
        discount: draft.discount,
        deliveryFee: draft.deliveryFee,
        couponCode: draft.couponCode,
        finalTotal: draft.finalTotal,
        items: draft.items,
      }));
    } catch (error) {
      console.error('Failed to place cash on delivery order', error);
      setCheckoutError('Unable to place your order right now. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const startOnlinePayment = async (draft: CheckoutOrderDraft) => {
    if (!RAZORPAY_KEY_ID) {
      setCheckoutError('Razorpay key is missing. Add VITE_RAZORPAY_KEY_ID to your frontend environment.');
      return;
    }

    setIsPlacingOrder(true);
    setCheckoutError('');

    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) {
        setCheckoutError('Please sign in again before starting payment.');
        setIsPlacingOrder(false);
        return;
      }

      const didLoadScript = await loadRazorpayCheckout();
      if (!didLoadScript || !window.Razorpay) {
        setCheckoutError('Unable to load Razorpay checkout right now. Please try again.');
        setDraftOrderId('');
        setIsPlacingOrder(false);
        return;
      }

      const paymentOrder = await postPaymentApi<RazorpayOrderResponse>(
        '/api/create-order',
        {
          orderDraft: draft,
          userId: currentUserId,
        },
        idToken,
      );

      const razorpay = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Coffee HUB',
        description: 'Food Order Payment',
        order_id: paymentOrder.razorpayOrderId,
        prefill: {
          name: draft.customer.name,
          email: currentUserEmail,
          contact: draft.customer.phone,
        },
        notes: {
          orderId: draft.orderId,
        },
        theme: {
          color: '#8b4a20',
        },
        handler: async response => {
          setIsPlacingOrder(true);

          try {
            const verificationToken = await auth.currentUser?.getIdToken(true);
            if (!verificationToken) {
              throw new Error('Please sign in again before verifying payment.');
            }

            const verificationResult = await postPaymentApi<RazorpayVerificationResponse>(
              '/api/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              verificationToken,
            );

            resetCheckoutAfterSuccess(verificationResult.order);
          } catch (error) {
            console.error('Failed to verify Razorpay payment', error);
            setCheckoutError('Payment was captured, but verification failed. Please contact support if the order is not visible.');
            setDraftOrderId('');
          } finally {
            setIsPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutError('Payment was cancelled before completion.');
            setDraftOrderId('');
            setIsPlacingOrder(false);
          },
        },
      });

      razorpay.on('payment.failed', response => {
        setCheckoutError(response.error?.description || 'Payment failed. Please try again.');
        setDraftOrderId('');
        setIsPlacingOrder(false);
      });

      setIsPlacingOrder(false);
      razorpay.open();
    } catch (error) {
      console.error('Failed to start online payment', error);
      const typedError = error as Error;
      setCheckoutError(typedError.message || 'Unable to start online payment right now. Please try again.');
      setDraftOrderId('');
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    const preparedOrder = await buildCheckoutDraft();
    if (!preparedOrder) {
      return;
    }

    if (customerDetails.payment === 'Pay Online') {
      await startOnlinePayment(preparedOrder.order);
      return;
    }

    await placeCashOnDeliveryOrder(preparedOrder.order);
  };

  const renderHome = () => (
    <div className="pb-12 sm:pb-16">
      <section className="relative overflow-hidden px-4 pt-20 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="coffee-surface relative mx-auto overflow-hidden rounded-[30px] px-5 pb-6 pt-5 sm:max-w-screen-md sm:px-6"
        >
          <div className="absolute inset-0">
            <img
              src="https://res.cloudinary.com/ddfhaqeme/image/upload/v1772699634/e0818545-8027-4b28-8a1f-d521f79fdb6a_plei96.jpg"
              alt="Coffee HUB hero"
              className="h-full w-full object-cover opacity-30"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,9,8,0.18),rgba(12,9,8,0.92)_72%)]" />
          </div>

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <span className="coffee-badge text-accent">
                <Coffee size={12} className="text-secondary" />
                Inkollu coffee kitchen
              </span>
              <span className="coffee-badge">
                <MapPin size={12} />
                Fast local delivery
              </span>
            </div>

            <div className="max-w-[18rem] space-y-3">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-secondary">
                  Brewed for mobile ordering
                </p>
                <h1 className="font-display text-[2.25rem] font-semibold leading-[0.95] text-accent sm:text-[2.7rem]">
                  Hot bowls, rich bites, fast pours.
                </h1>
              </div>
              <p className="text-sm leading-6 text-ink-muted">
                Compact ordering for hungry evenings, quick reorders, and warm coffee-house vibes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab('menu')}
                className="coffee-btn-primary"
              >
                <ShoppingBag size={16} />
                <span>Order now</span>
              </button>
              <button
                onClick={() => setActiveTab('offers')}
                className="coffee-btn-secondary"
              >
                <BadgePercent size={16} />
                <span>Offers</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              {[
                { label: 'Delivery', value: '20-30m' },
                { label: 'Fresh picks', value: `${menu.length}+` },
                { label: 'Rewards', value: activeOffers.length > 0 ? `${activeOffers.length}` : '0' },
              ].map(metric => (
                <div key={metric.label} className="coffee-surface-soft rounded-[20px] px-3 py-3">
                  <p className="text-[15px] font-semibold text-accent">{metric.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {activeOffers[0] && (
        <section className="px-4 pt-4 sm:px-6">
          <motion.div
            whileHover={{ y: -2 }}
            className="mx-auto flex max-w-screen-md items-center gap-3 rounded-[24px] border border-secondary/20 bg-[linear-gradient(135deg,rgba(192,138,93,0.18),rgba(61,41,31,0.96))] px-4 py-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ffcc8a,#ffb347)] text-[#3c2518]">
              <Tag size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Today&apos;s pour</p>
              <p className="mt-1 truncate text-sm font-semibold text-accent">{activeOffers[0].title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{activeOffers[0].description}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-[#130e0c]/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {activeOffers[0].couponCode}
            </div>
          </motion.div>
        </section>
      )}

      <section className="px-4 pt-6 sm:px-6">
        <div className="mx-auto max-w-screen-md space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">Popular right now</p>
              <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">Quick picks</h2>
            </div>
            <button onClick={() => setActiveTab('menu')} className="coffee-btn-secondary min-h-10 px-3">
              <span>Menu</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
            {isMenuLoading
              ? [...Array(4)].map((_, index) => (
                  <div key={index} className="min-w-[228px] max-w-[228px]">
                    <MenuSkeletonCard />
                  </div>
                ))
              : menu.slice(0, 6).map(item => (
                  <div key={item.id} className="min-w-[228px] max-w-[228px]">
                    <CoffeeFoodCard
                      item={item}
                      onAdd={handleAddToCart}
                      cartQuantity={cartQuantityById.get(item.id) || 0}
                    />
                  </div>
                ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="coffee-surface-soft rounded-[24px] px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/25 text-secondary">
                <Clock size={20} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-accent">Fast lanes</h3>
              <p className="mt-1 text-xs leading-5 text-ink-muted">Compact checkout built for quick repeat orders on mobile.</p>
            </div>
            <div className="coffee-surface-soft rounded-[24px] px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-highlight/12 text-highlight">
                <ShieldCheck size={20} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-accent">Fresh & safe</h3>
              <p className="mt-1 text-xs leading-5 text-ink-muted">Secure payments, clean prep, and order tracking from one drawer.</p>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-secondary" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                Why customers love Coffee Hub
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: '4.5+ Local Rating', icon: Star, tone: 'text-[#ffbf5e] bg-[#2b1a0f]' },
                { label: 'Freshly Prepared Food', icon: ChefHat, tone: 'text-[#f6c18b] bg-[#241510]' },
                { label: 'Fast Delivery in Inkollu', icon: Truck, tone: 'text-[#7dd3fc] bg-[#14202a]' },
                { label: 'Daily Offers & Rewards', icon: Gift, tone: 'text-[#c4b5fd] bg-[#1f1a2f]' },
              ].map(item => (
                <div
                  key={item.label}
                  className="group flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#120d0b]/80 px-3 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${item.tone}`}>
                    <item.icon size={16} />
                  </div>
                  <p className="text-xs font-semibold text-[#f5ede3]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(18,12,9,0.92),rgba(12,8,6,0.96))] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
              Serving Inkollu &amp; Nearby Areas
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1a1411] text-secondary">
                  <Truck size={16} />
                </div>
                <p className="text-sm font-semibold text-[#f5ede3]">
                  Average delivery time: 20–30 minutes
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1a1411] text-secondary">
                  <MapPin size={16} />
                </div>
                <p className="text-sm font-semibold text-[#f5ede3]">Inkollu Coffee Kitchen</p>
              </div>
            </div>
            <a
              href="https://maps.app.goo.gl/8B32K8X6Vdhg6VUE6"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[#fff8f2] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </section>
    </div>
  );
  const renderOffers = () => (
    <div className="pt-24 pb-24 px-6 space-y-6">
      <h2 className="text-3xl font-black mb-8">Exclusive Offers</h2>

      {offersError ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-primary">
          {offersError}
        </div>
      ) : isOffersLoading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-ink-muted">
          Loading offers...
        </div>
      ) : activeOffers.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-ink-muted">
          No active offers available right now.
        </div>
      ) : (
        activeOffers.map(offer => (
          <motion.div
            key={offer.id}
            whileHover={{ scale: 1.02 }}
            className="relative flex flex-col gap-2 overflow-hidden rounded-3xl border border-accent/20 bg-accent/90 p-4 text-black sm:gap-3 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/15">
                  <Tag size={16} />
                </div>
                <h3 className="min-w-0 text-base font-black leading-snug sm:text-lg">{offer.title}</h3>
              </div>
              <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `FLAT Rs ${offer.discountValue} OFF`}
              </span>
            </div>
            <p className="text-sm font-bold leading-5 opacity-80">{offer.description}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="rounded-lg bg-black/20 px-3 py-1 text-[11px] font-black uppercase tracking-wide">
                {offer.couponCode}
              </div>
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-black/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide"
              >
                Apply
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
  const renderMenu = () => (
    <div id="menu-section" className="px-4 pb-28 pt-20 sm:px-6">
      <div className="mx-auto max-w-screen-md">
        <div className="sticky top-[72px] z-30 rounded-[28px] border border-white/8 bg-[#0f0b09]/88 px-3 py-3 backdrop-blur-xl">
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
            <input
              type="text"
              placeholder="Search noodles, rice, drinks..."
              className="coffee-input pl-11"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`coffee-tab whitespace-nowrap ${
                  selectedCategory === cat ? 'coffee-tab-active' : 'bg-white/5 text-ink-muted hover:bg-white/8'
                }`}
              >
                <Coffee size={13} className={selectedCategory === cat ? 'text-highlight' : 'text-secondary'} />
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Menu board</p>
            <h2 className="mt-1 text-[1.35rem] font-semibold text-accent">
              {selectedCategory === 'All' ? 'Everything fresh today' : selectedCategory}
            </h2>
          </div>
          <span className="coffee-badge">{isMenuLoading ? 'Loading...' : `${filteredMenu.length} items`}</span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 pb-28 sm:pb-32 sm:grid-cols-2 lg:grid-cols-3">
          {isMenuLoading
            ? [...Array(6)].map((_, index) => <MenuSkeletonCard key={index} />)
            : filteredMenu.map(item => (
                <CoffeeFoodCard
                  key={item.id}
                  item={item}
                  onAdd={handleAddToCart}
                  cartQuantity={cartQuantityById.get(item.id) || 0}
                />
              ))}
        </div>

        {!isMenuLoading && filteredMenu.length === 0 && (
          <div className="coffee-surface-soft mt-6 rounded-[26px] px-5 py-10 text-center">
            <Search size={42} className="mx-auto text-ink-muted/40" />
            <p className="mt-4 text-sm font-semibold text-accent">No items match your search</p>
            <p className="mt-2 text-xs leading-5 text-ink-muted">Try a different keyword or switch the category chip above.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTracking = () => (
    <div className="pt-24 pb-24 px-6 max-w-md mx-auto">
      {!orderStatus ? (
        <div className="py-20">
          <ShoppingBag size={64} className="mx-auto text-ink-muted mb-6 opacity-20" />
          <h2 className="text-2xl font-black mb-2 text-center">No Active Orders</h2>
          <p className="text-ink-muted mb-8 text-center">Enter your order ID to track your delivery.</p>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
            <input
              type="text"
              placeholder="Order ID (e.g. COF1001)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 uppercase focus:outline-none focus:border-primary"
              value={trackingOrderId}
              onChange={(e) => setTrackingOrderId(e.target.value.toUpperCase())}
            />
            {trackingError && (
              <p className="text-xs text-primary font-bold">{trackingError}</p>
            )}
            <button
              onClick={handleTrackOrderLookup}
              disabled={isTrackingOrder}
              className="w-full bg-primary text-white py-3 rounded-2xl font-bold disabled:opacity-70"
            >
              {isTrackingOrder ? 'TRACKING...' : 'TRACK ORDER'}
            </button>
          </div>
          <button 
            onClick={() => setActiveTab('menu')}
            className="w-full mt-5 bg-white/5 text-ink py-3 rounded-2xl font-bold"
          >
            Go to Menu
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs text-ink-muted uppercase tracking-widest font-bold">Order ID</span>
                <h2 className="text-2xl font-black text-accent">#{orderStatus.id}</h2>
              </div>
              <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold">
                {orderStatus.status}
              </div>
            </div>
            
            <div className="space-y-8 relative">
              {/* Progress Line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-white/10" />
              
              {[
                { label: 'Pending', status: 'Pending', icon: CheckCircle2 },
                { label: 'Preparing', status: 'Preparing', icon: Flame },
                { label: 'Out for Delivery', status: 'Out for Delivery', icon: MapPin },
                { label: 'Delivered', status: 'Delivered', icon: ShoppingBag },
              ].map((step, i) => {
                const currentIdx = ORDER_STATUSES.indexOf(orderStatus.status);
                const isCompleted = i <= currentIdx;
                const isActive = i === currentIdx;
                
                return (
                  <div key={step.label} className="flex items-center gap-6 relative z-10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isCompleted ? "bg-primary text-white" : "bg-white/10 text-ink-muted"
                    }`}>
                      <step.icon size={12} />
                    </div>
                    <div className={isActive ? "text-white font-bold" : "text-ink-muted"}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
            <h3 className="font-bold mb-4">Order Summary</h3>
            <div className="space-y-3">
              {orderStatus.items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-ink-muted">{item.quantity}x {item.name}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-white/10 flex justify-between font-black text-lg">
                <span>Total</span>
                <span className="text-primary">₹{orderStatus.total_amount}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setOrderStatus(null);
              setTrackingError('');
            }}
            className="w-full mt-8 text-ink-muted font-bold text-sm"
          >
            Clear Tracking
          </button>
        </div>
      )}
    </div>
  );

  const renderTrackingExperience = () => (
    <div className="px-4 pb-24 pt-24 sm:px-6">
      {!orderStatus ? (
        <div className="mx-auto max-w-screen-md py-16">
          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] px-6 py-10 text-center shadow-[0_26px_80px_rgba(0,0,0,0.28)]">
            <ShoppingBag size={64} className="mx-auto mb-6 text-ink-muted opacity-20" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-secondary">
              Live Tracking
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-accent">Track your delivery</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">
              Enter your order ID to open the live map, rider route, and premium delivery updates.
            </p>

            <div className="mx-auto mt-8 max-w-md space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5 text-left">
              <input
                type="text"
                placeholder="Order ID (e.g. COF1001)"
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 uppercase focus:border-primary focus:outline-none"
                value={trackingOrderId}
                onChange={event => setTrackingOrderId(event.target.value.toUpperCase())}
              />
              {trackingError && (
                <p className="text-xs font-bold text-primary">{trackingError}</p>
              )}
              <button
                onClick={handleTrackOrderLookup}
                disabled={isTrackingOrder}
                className="w-full rounded-2xl bg-primary py-3 font-bold text-white disabled:opacity-70"
              >
                {isTrackingOrder ? 'TRACKING...' : 'TRACK ORDER'}
              </button>
            </div>

            <button
              onClick={() => setActiveTab('menu')}
              className="mt-5 w-full rounded-2xl bg-white/5 py-3 font-bold text-ink sm:mx-auto sm:max-w-md"
            >
              Go to Menu
            </button>
          </div>
        </div>
      ) : (
        <OrderTrackingPage
          coffeeShopLocation={COFFEE_SHOP_LOCATION}
          onBackToOrders={() => setActiveTab('orders')}
          onClearTracking={() => {
            setOrderStatus(null);
            setTrackingError('');
          }}
          order={orderStatus}
        />
      )}
    </div>
  );

  const renderAbout = () => (
    <div className="pt-24 pb-24 px-6 max-w-2xl mx-auto">
      <h2 className="text-4xl font-black mb-8">Our Story</h2>
      <div className="aspect-video rounded-[40px] overflow-hidden mb-8">
        <img 
          src="https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=1200&q=80" 
          alt="Kitchen" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="space-y-6 text-ink-muted leading-relaxed">
        <p>
          <span className="text-white font-bold">COFFE HUB</span> serves hot Indo-Chinese street food made with fresh ingredients and authentic wok cooking style.
        </p>
        <p>
          Born in the heart of Inkollu, we bring the fiery flavors of the wok to your doorstep. Our chefs specialize in the perfect balance of spices, textures, and that signature "wok hei" (breath of the wok).
        </p>
        <p>
          We focus on hygiene, taste, and lightning-fast service. Whether it's our signature Chicken Manchurian or the classic Veg Noodles, every dish is a celebration of street-style Chinese fast food.
        </p>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="pt-24 pb-24 px-6 max-w-2xl mx-auto">
      <h2 className="text-4xl font-black mb-8">Contact Us</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-xs text-ink-muted font-bold uppercase">Call Us</p>
              <p className="font-bold">+91 7893504892</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
              <Mail size={24} />
            </div>
            <div>
              <p className="text-xs text-ink-muted font-bold uppercase">Email Us</p>
              <p className="font-bold">thekindbridge@gmail.com</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-xs text-ink-muted font-bold uppercase">Location</p>
              <p className="font-bold">Coffee Hub</p>
              <p className="text-sm text-ink-muted">R5CQ+CM Inkollu, Andhra Pradesh, India</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 p-6 rounded-[40px] border border-white/10">
          <h4 className="font-bold mb-4">Follow Us</h4>
          <div className="flex gap-4">
            {['Instagram', 'WhatsApp', 'Telegram'].map(social => (
              <div key={social} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                <span className="text-[10px] font-bold">{social[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[40px] overflow-hidden border border-white/10 grayscale contrast-125">
          <div className="relative w-full aspect-[16/12] sm:aspect-[16/9]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d506.35838004601595!2d80.18905782789219!3d15.82115881859916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4a5989b6574b4b%3A0x586644323376bd00!2sCOFFEE%20HUB!5e1!3m2!1sen!2sin!4v1773126673652!5m2!1sen!2sin"
              title="Coffee Hub Inkollu Map"
              className="absolute inset-0 h-full w-full"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
        <a
          href="https://maps.app.goo.gl/8B32K8X6Vdhg6VUE6"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#fff8f2] transition-colors hover:bg-primary"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );

  const renderLogin = () => (
    <AuthShell>
      <motion.section
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[350px] overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,250,244,0.1),rgba(88,50,28,0.1))] px-5 py-6 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-[12px] sm:max-w-[380px] sm:px-7 sm:py-7"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,224,190,0.14),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mx-auto mb-6 mt-1 flex h-36 w-36 items-center justify-center rounded-[38px] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,235,212,0.16),rgba(90,51,29,0.08)_72%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_22px_55px_rgba(13,7,4,0.38)] sm:h-40 sm:w-40">
            <SteamEffect className="-top-14 scale-110 sm:-top-16 sm:scale-125" />
            <div className="absolute inset-3 rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
            <Coffee className="coffee-icon-float relative text-[#ffc58b]" size={68} strokeWidth={1.65} />
          </div>

          <h1 className="font-display text-[2.1rem] font-semibold tracking-[0.08em] text-[#fff8f1] sm:text-[2.45rem]">
            COFFEE HUB
          </h1>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.45em] text-[#f0cfad] sm:text-xs">
            Inkollu
          </p>
          <p className="mt-3 text-sm font-medium text-[#f8e9d8] sm:text-[15px]">
            Fresh Food <span aria-hidden="true">&bull;</span> Fast Delivery
          </p>

          <motion.button
            onClick={() => {
              void handleGoogleLogin();
            }}
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.985 }}
            className="google-btn group relative mt-7 flex w-full items-center justify-center gap-3 overflow-hidden rounded-[20px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,250,244,0.94),rgba(244,229,211,0.86))] px-4 py-3.5 text-[15px] font-semibold text-[#24140b] shadow-[0_14px_34px_rgba(24,12,6,0.3)] transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(18,8,4,0.34)]"
          >
            <span className="pointer-events-none absolute inset-y-0 left-[-35%] w-20 rotate-[18deg] bg-white/30 blur-2xl auth-card-sheen" />
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-[0_10px_22px_rgba(255,255,255,0.16)]">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 3.6 14.5 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.9-3.7 8.9-8.9 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
            </span>
            <span className="relative">Sign in with Google</span>
            <ArrowRight size={17} className="relative text-[#8e5327] transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </div>
      </motion.section>
    </AuthShell>
  );

  if (!isAuthReady) {
    return (
      <AuthShell>
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative w-full max-w-[430px] overflow-hidden rounded-[32px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,251,247,0.14),rgba(89,50,29,0.14))] px-6 py-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.46)] backdrop-blur-[22px] sm:px-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,224,190,0.16),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
          <div className="relative">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))]">
              <SteamEffect className="-top-9" />
              <Coffee className="coffee-icon-float text-[#ffbf80]" size={26} strokeWidth={1.8} />
            </div>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.38em] text-[#efcfb3]">
              COFFEE HUB
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[#fff7ee]">
              Preparing your sign-in
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#f3ddc5]/72">
              Connecting Firebase authentication and warming up your premium ordering experience.
            </p>
            <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-medium text-[#f8e9d8]/85">
              <span className="h-2 w-2 rounded-full bg-[#ffb15d] animate-pulse" />
              Loading authentication...
            </div>
          </div>
        </motion.section>
      </AuthShell>
    );
  }

  if (!isLoggedIn) {
    return renderLogin();
  }

  if (isAdmin) {
    return (
      <div className="app-shell">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/6 bg-[#120d0b]/78 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8b6145,#4e3427)] shadow-[0_14px_30px_rgba(62,39,35,0.32)]">
                <User className="text-accent" size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-secondary">Admin console</p>
                <p className="mt-1 text-sm font-semibold text-accent">Coffee HUB operations</p>
              </div>
            </div>
            <button
              onClick={handleOpenStaffProfile}
              className="coffee-icon-btn"
              aria-label="Profile"
            >
              <User size={18} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-screen-md">
          <AdminDashboard
            orders={adminOrders}
            offers={offers}
            isOffersLoading={isOffersLoading}
            offersError={offersError}
            newOrderDocIds={newOrderDocIds}
            orderStatuses={ORDER_STATUSES}
            deliveryAgents={deliveryAgents}
            onUpdateStatus={(orderDocId, status) => {
              void updateOrderStatus(orderDocId, status);
            }}
            onCreateOffer={createOffer}
            onUpdateOffer={updateOffer}
            onDeleteOffer={deleteOffer}
            onToggleOfferStatus={toggleOfferStatus}
          />
        </main>

        {renderStaffProfileDrawer()}
      </div>
    );
  }

  if (isDeliveryAgent) {
    return (
      <div className="app-shell">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/6 bg-[#120d0b]/78 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8b6145,#4e3427)] shadow-[0_14px_30px_rgba(62,39,35,0.32)]">
                <MapPin className="text-accent" size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-secondary">Delivery panel</p>
                <p className="mt-1 text-sm font-semibold text-accent">Orders on the move</p>
              </div>
            </div>
            <button
              onClick={handleOpenStaffProfile}
              className="coffee-icon-btn"
              aria-label="Profile"
            >
              <User size={18} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-screen-md">
          <AgentDashboard
            activeOrder={currentDeliveryOrder}
            deliveryAgent={currentDeliveryAgent}
            deliverySession={currentDeliverySession}
            isAuthorized={isDeliveryAgent}
            isTracking={isAgentTracking}
            lastTrackedLocation={agentLastTrackedLocation}
            orders={adminOrders}
            onEndDelivery={orderDocId => {
              void handleEndDelivery(orderDocId);
            }}
            onStartDelivery={() => {
              void handleStartDelivery();
            }}
            permissionState={agentPermissionState}
            trackerStatus={agentTrackerStatus}
          />
        </main>

        {renderStaffProfileDrawer()}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/6 bg-[#120d0b]/78 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8b6145,#4e3427)] shadow-[0_14px_30px_rgba(62,39,35,0.32)]">
              <Coffee className="text-accent" size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-secondary">Coffee HUB</p>
              <p className="mt-1 text-sm font-semibold text-accent">Fresh food, brewed fast</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-ink-muted sm:block">
              {currentUserEmail}
            </div>
            <button
              onClick={handleOpenProfile}
              className="coffee-icon-btn"
              aria-label="Profile"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-screen-md">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'menu' && renderMenu()}
        {activeTab === 'offers' && renderOffers()}
        {activeTab === 'orders' && (
          <MyOrders
            orders={userOrders}
            isLoading={isUserOrdersLoading}
            onBrowseMenu={() => setActiveTab('menu')}
            onTrackOrder={handleTrackFromOrder}
          />
        )}
        {activeTab === 'tracking' && renderTrackingExperience()}
        {activeTab === 'about' && renderAbout()}
        {activeTab === 'contact' && renderContact()}
      </main>

      {/* Footer Links */}
      {activeTab === 'home' && (
        <footer className="px-6 pb-32 pt-12 border-t border-white/5 mt-12">
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h4 className="font-black mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li onClick={() => setActiveTab('about')} className="cursor-pointer hover:text-primary">About Us</li>
                <li onClick={() => setActiveTab('contact')} className="cursor-pointer hover:text-primary">Contact</li>
                <li onClick={() => setActiveTab('menu')} className="cursor-pointer hover:text-primary">Menu</li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li className="hover:text-primary">Privacy Policy</li>
                <li className="hover:text-primary">Terms of Service</li>
              </ul>
            </div>
          </div>
          <p className="text-center text-[10px] text-ink-muted uppercase tracking-widest font-bold">
            © 2024 COFFE HUB. All rights reserved.
          </p>
        </footer>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && activeTab !== 'tracking' && (
        <motion.button
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-24 left-4 right-4 z-40 mx-auto flex max-w-screen-md items-center justify-between rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(111,78,55,0.96),rgba(62,39,35,0.96))] px-4 py-3 text-white shadow-[0_22px_40px_rgba(40,22,16,0.45)] active:scale-[0.98] sm:left-6 sm:right-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              {cartCount} item{cartCount === 1 ? '' : 's'}
            </div>
            <div className="text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Cart ready</p>
              <p className="text-sm font-semibold text-accent">View bag</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <span>₹{payableCartTotal}</span>
            <ChevronRight size={18} />
          </div>
        </motion.button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#0f0b09]/92 px-4 py-3 backdrop-blur-2xl sm:px-6">
        <div className="mx-auto grid max-w-screen-md grid-cols-4 gap-2 rounded-[24px] border border-white/8 bg-[#120d0b]/88 p-2 shadow-[0_-10px_36px_rgba(0,0,0,0.16)]">
          {[
            {
              id: 'home',
              icon: Home,
              label: 'Home',
              active: activeTab === 'home',
              onClick: () => setActiveTab('home'),
            },
            {
              id: 'menu',
              icon: MenuIcon,
              label: 'Menu',
              active: activeTab === 'menu',
              onClick: () => setActiveTab('menu'),
            },
            {
              id: 'offers',
              icon: Tag,
              label: 'Offers',
              active: activeTab === 'offers',
              onClick: () => setActiveTab('offers'),
            },
            {
              id: 'orders',
              icon: Clock,
              label: 'Orders',
              active: activeTab === 'orders',
              onClick: () => setActiveTab('orders'),
            },
          ].map(item => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`coffee-nav-pill ${
                item.active ? 'coffee-nav-pill-active' : 'hover:bg-white/5 hover:text-accent'
              }`}
            >
              <item.icon size={20} strokeWidth={item.active ? 2.4 : 2} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Profile Drawer */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseProfile}
              className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] shadow-[0_0_60px_rgba(0,0,0,0.45)]"
            >
              <div className="border-b border-white/6 px-5 pb-4 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">
                      Customer Profile
                    </p>
                    <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">Profile details</h2>
                  </div>
                  <button onClick={handleCloseProfile} className="coffee-icon-btn">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isProfileSavedToastVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pt-4"
                  >
                    <div className="flex items-center gap-2 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 size={14} />
                      Profile Saved Successfully
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-6 pt-4">
                <div className="coffee-surface-soft rounded-[26px] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                    Profile Information
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="text"
                          className="coffee-input pl-10"
                          value={profileDraft.name}
                          onChange={event => setProfileDraft(prev => ({ ...prev, name: event.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">
                          +91
                        </span>
                        <input
                          type="tel"
                          className="coffee-input pl-16"
                          value={profileDraft.phone}
                          onChange={event => setProfileDraft(prev => ({ ...prev, phone: event.target.value }))}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Email (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="email"
                          className="coffee-input pl-10"
                          value={profileDraft.email}
                          onChange={event => setProfileDraft(prev => ({ ...prev, email: event.target.value }))}
                          placeholder="name@email.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="coffee-surface-soft rounded-[26px] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                    Delivery Addresses
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Save up to 3 delivery locations for faster checkout.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                        Primary Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-4 h-4 w-4 text-ink-muted" />
                        <textarea
                          className="coffee-textarea pl-10"
                          value={profileDraft.addresses[0] || ''}
                          onChange={event => {
                            const value = event.target.value;
                            setProfileDraft(prev => {
                              const nextAddresses = ensureProfileAddresses(prev.addresses);
                              nextAddresses[0] = value;
                              return { ...prev, addresses: nextAddresses };
                            });
                          }}
                          placeholder="Street, landmark, city"
                        />
                      </div>
                    </div>
                    <AnimatePresence initial={false}>
                      {isProfileAddressExpanded && (
                        <motion.div
                          key="profile-more-addresses"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="space-y-3 overflow-hidden"
                        >
                          {[1, 2].map(index => (
                            <div key={`profile-address-${index}`}>
                              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                                Address {index + 1}
                              </label>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-4 h-4 w-4 text-ink-muted" />
                                <textarea
                                  className="coffee-textarea pl-10"
                                  value={profileDraft.addresses[index] || ''}
                                  onChange={event => {
                                    const value = event.target.value;
                                    setProfileDraft(prev => {
                                      const nextAddresses = ensureProfileAddresses(prev.addresses);
                                      nextAddresses[index] = value;
                                      return { ...prev, addresses: nextAddresses };
                                    });
                                  }}
                                  placeholder="Street, landmark, city"
                                />
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProfileAddressExpanded(prev => !prev)}
                    className="coffee-btn-secondary mt-4 w-full justify-center"
                  >
                    {isProfileAddressExpanded ? 'Hide Addresses' : 'View More Addresses'}
                  </button>
                </div>

                {profileError && (
                  <div className="rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                    {profileError}
                  </div>
                )}
              </div>

              <div className="border-t border-white/6 bg-[#0f0b09]/94 px-5 py-4">
                <button
                  onClick={() => void handleSaveProfile()}
                  disabled={isProfileSaving}
                  className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                >
                  {isProfileSaving ? 'Saving profile...' : 'Save Profile'}
                </button>
                <button
                  onClick={() => {
                    handleCloseProfile();
                    void handleLogout();
                  }}
                  className="coffee-btn-secondary mt-3 w-full justify-center"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[90vh] max-w-screen-md flex-col rounded-t-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] shadow-[0_-24px_60px_rgba(0,0,0,0.42)]"
            >
              <div className="border-b border-white/6 px-5 pb-4 pt-3">
                <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/10" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">Cart drawer</p>
                    <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">
                      {checkoutStep === 'cart' ? 'Your cart' : checkoutStep === 'details' ? 'Checkout details' : 'Order ready'}
                    </h2>
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="coffee-icon-btn">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-grow space-y-5 overflow-y-auto px-5 pb-5 pt-4">
                {checkoutStep === 'cart' && (
                  <>
                    {!hasCartItems ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="coffee-surface-soft flex min-h-[320px] flex-col items-center justify-center rounded-[28px] px-6 text-center"
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/16 text-secondary">
                          <ShoppingBag size={28} />
                        </div>
                        <p className="mt-5 text-[1.4rem] font-semibold text-accent">Your cart is empty</p>
                        <p className="mt-2 text-sm leading-6 text-ink-muted">
                          Add items from menu to start your order.
                        </p>
                        <button
                          onClick={handleBrowseMenu}
                          className="coffee-btn-primary mt-6"
                        >
                          <ArrowRight size={16} />
                          Browse Menu
                        </button>
                      </motion.div>
                    ) : (
                      <>
                        {cart.map(item => (
                          <div key={item.id} className="coffee-surface-soft flex gap-3 rounded-[24px] p-3">
                            <div className="h-[78px] w-[78px] overflow-hidden rounded-[20px] flex-shrink-0">
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-grow">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="truncate text-sm font-semibold text-accent">{item.name}</h4>
                                  <p className="mt-1 text-sm font-semibold text-secondary">{CURRENCY_SYMBOL}{item.price}</p>
                                </div>
                                <div className="text-sm font-semibold text-accent">{CURRENCY_SYMBOL}{item.price * item.quantity}</div>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#120d0b]/92 p-1.5">
                                  <button onClick={() => handleAddToCart(item, -1)} className="coffee-icon-btn h-8 w-8 rounded-full border-none bg-white/6">
                                    <Minus size={14} />
                                  </button>
                                  <span className="min-w-5 text-center text-sm font-semibold text-accent">{item.quantity}</span>
                                  <button onClick={() => handleAddToCart(item, 1)} className="coffee-icon-btn h-8 w-8 rounded-full border-none bg-primary text-white hover:text-white">
                                    <Plus size={14} />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted hover:text-accent"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="coffee-surface-soft rounded-[24px] p-4">
                          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                            Enter Coupon Code
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponInput}
                              onChange={e => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="e.g. SAVE20"
                              className="coffee-input min-h-11 uppercase"
                            />
                            <button
                              onClick={() => (appliedCouponCode ? handleRemoveCoupon() : void handleApplyCoupon())}
                              disabled={isApplyingCoupon || !hasCartItems}
                              className="coffee-btn-primary min-h-11 px-4 text-[11px] uppercase tracking-[0.16em] disabled:opacity-60"
                            >
                              {appliedCouponCode ? 'REMOVE' : (isApplyingCoupon ? 'APPLYING...' : 'APPLY')}
                            </button>
                          </div>
                          {couponError && <p className="mt-2 text-xs font-semibold text-primary">{couponError}</p>}
                          <AnimatePresence mode="wait">
                            {couponSuccess && (
                              <motion.p
                                key={couponSuccess}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="mt-2 text-xs font-semibold text-emerald-400"
                              >
                                {couponSuccess}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="coffee-surface-soft space-y-2 rounded-[24px] p-4">
                          <div className="flex justify-between text-sm text-ink-muted">
                            <span>Subtotal</span>
                            <span>{CURRENCY_SYMBOL}{cartTotal}</span>
                          </div>
                          <AnimatePresence initial={false}>
                            {discountAmount > 0 && (
                              <motion.div
                                key={`discount-${discountAmount}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="flex justify-between text-sm text-emerald-400"
                              >
                                <span>Discount</span>
                                <span>-{CURRENCY_SYMBOL}{discountAmount}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="flex justify-between text-sm text-ink-muted">
                            <span>Delivery Fee</span>
                            <span>{CURRENCY_SYMBOL}{deliveryFee}</span>
                          </div>
                          {appliedCouponCode && (
                            <div className="flex justify-between text-sm text-ink-muted">
                              <span>Coupon Applied</span>
                              <span className="font-semibold text-accent">{appliedCouponCode}</span>
                            </div>
                          )}
                          <motion.div
                            key={`final-total-${payableCartTotal}-${discountAmount}-${deliveryFee}`}
                            initial={{ opacity: 0.75, scale: 0.98 }}
                            animate={{
                              opacity: 1,
                              scale: isCouponAppliedPulseVisible ? [1, 1.03, 1] : 1,
                            }}
                            transition={{ duration: 0.35 }}
                            className="flex justify-between border-t border-white/6 pt-3 text-[1.05rem] font-semibold"
                          >
                            <span>Final Total</span>
                            <span className="text-highlight">{CURRENCY_SYMBOL}{payableCartTotal}</span>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </>
                )}
                {checkoutStep === 'details' && (
                  <div className="space-y-5">
                    <div className="coffee-surface-soft rounded-[26px] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Order Summary</p>
                          <p className="mt-1 text-sm text-ink-muted">{cartCount} item{cartCount === 1 ? '' : 's'} in this order</p>
                        </div>
                        <p className="text-lg font-semibold text-highlight">{CURRENCY_SYMBOL}{payableCartTotal}</p>
                      </div>
                      <div className="mt-4 space-y-3">
                        {cart.map(item => (
                          <div key={`summary-${item.id}`} className="flex items-start justify-between gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-accent">{item.name}</p>
                              <p className="text-xs text-ink-muted">Qty {item.quantity}</p>
                            </div>
                            <span className="font-semibold text-ink-muted">{CURRENCY_SYMBOL}{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                        <div className="flex justify-between text-ink-muted">
                          <span>Subtotal</span>
                          <span>{CURRENCY_SYMBOL}{cartTotal}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-400">
                            <span>Discount</span>
                            <span>-{CURRENCY_SYMBOL}{discountAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-ink-muted">
                          <span>Delivery Charge</span>
                          <span>{CURRENCY_SYMBOL}{deliveryFee}</span>
                        </div>
                        <div className="flex justify-between pt-2 text-base font-semibold">
                          <span>Total Amount</span>
                          <span className="text-highlight">{CURRENCY_SYMBOL}{payableCartTotal}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Full Name</label>
                      <input
                        type="text"
                        className="coffee-input"
                        value={customerDetails.name}
                        onChange={event => {
                          setCheckoutError('');
                          setCustomerDetails(prev => ({ ...prev, name: event.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Phone Number</label>
                      <input
                        type="tel"
                        className="coffee-input"
                        value={customerDetails.phone}
                        onChange={event => {
                          setCheckoutError('');
                          setCustomerDetails(prev => ({ ...prev, phone: event.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Delivery Address</label>
                      {savedAddressOptions.length > 0 ? (
                        <div className="space-y-3">
                          <div className="rounded-[18px] border border-white/10 bg-[#120d0b]/75 px-3 py-2 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                                  {selectedAddressLabel}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                                  {checkoutAddressSummary || 'Add a delivery address.'}
                                </p>
                              </div>
                              <MapPin size={14} className="mt-0.5 text-secondary" />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsCheckoutAddressListOpen(prev => !prev)}
                            className="coffee-btn-secondary w-full justify-center"
                          >
                            {isCheckoutAddressListOpen ? 'Hide Addresses' : 'All Addresses'}
                          </button>

                          <AnimatePresence initial={false}>
                            {isCheckoutAddressListOpen && (
                              <motion.div
                                key="checkout-addresses"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="space-y-2 overflow-hidden"
                              >
                                {savedAddressOptions.map(option => {
                                  const isSelected = selectedAddressIndex === option.index;
                                  return (
                                    <button
                                      key={`saved-address-${option.index}`}
                                      type="button"
                                      onClick={() => {
                                        setCheckoutError('');
                                        hasCheckoutAddressSelectionRef.current = true;
                                        setSelectedAddressIndex(option.index);
                                        setIsCheckoutAddressListOpen(false);
                                      }}
                                      className={`flex w-full items-start gap-3 rounded-[18px] border px-3 py-2 text-left transition ${
                                        isSelected
                                          ? 'border-secondary/40 bg-white/5 shadow-[0_10px_20px_rgba(62,39,35,0.14)]'
                                          : 'border-white/10 bg-[#120d0b]/70 hover:border-white/20'
                                      }`}
                                    >
                                      <span
                                        className={`mt-1 flex h-3 w-3 items-center justify-center rounded-full border ${
                                          isSelected ? 'border-secondary bg-secondary' : 'border-white/20'
                                        }`}
                                      >
                                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#120d0b]" />}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-accent">{option.label}</p>
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{option.value}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCheckoutError('');
                                    hasCheckoutAddressSelectionRef.current = true;
                                    setSelectedAddressIndex('new');
                                    setIsCheckoutAddressListOpen(true);
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-2 text-left transition ${
                                    selectedAddressIndex === 'new'
                                      ? 'border-secondary/40 bg-white/5 shadow-[0_10px_20px_rgba(62,39,35,0.14)]'
                                      : 'border-white/10 bg-[#120d0b]/70 hover:border-white/20'
                                  }`}
                                >
                                  <span
                                    className={`flex h-3 w-3 items-center justify-center rounded-full border ${
                                      selectedAddressIndex === 'new'
                                        ? 'border-secondary bg-secondary'
                                        : 'border-white/20'
                                    }`}
                                  >
                                    {selectedAddressIndex === 'new' && <span className="h-1.5 w-1.5 rounded-full bg-[#120d0b]" />}
                                  </span>
                                  <div>
                                    <p className="text-xs font-semibold text-accent">Enter New Address</p>
                                    <p className="mt-1 text-[11px] text-ink-muted">Type a new delivery address.</p>
                                  </div>
                                </button>
                                {selectedAddressIndex === 'new' && (
                                  <textarea
                                    className="coffee-textarea min-h-[88px]"
                                    value={customerDetails.address}
                                    onChange={event => {
                                      setCheckoutError('');
                                      setSelectedAddressIndex('new');
                                      hasCheckoutAddressSelectionRef.current = true;
                                      setCustomerDetails(prev => ({ ...prev, address: event.target.value }));
                                    }}
                                    placeholder="Street, landmark, city"
                                  />
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <textarea
                          className="coffee-textarea"
                          value={customerDetails.address}
                          onChange={event => {
                            setCheckoutError('');
                            setSelectedAddressIndex('new');
                            hasCheckoutAddressSelectionRef.current = true;
                            setCustomerDetails(prev => ({ ...prev, address: event.target.value }));
                          }}
                          placeholder="Street, landmark, city"
                        />
                      )}
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                            Live Delivery Location
                          </label>
                        </div>
                        <button
                          onClick={() => {
                            void handleCaptureCustomerLocation();
                          }}
                          disabled={isLocatingCustomer}
                          className="coffee-btn-primary min-h-11 px-4 text-[11px] uppercase tracking-[0.18em] disabled:opacity-60"
                        >
                          {isLocatingCustomer ? 'Locating...' : 'Location'}
                        </button>
                      </div>
                      <div className="mt-4 rounded-[18px] border border-white/10 bg-[#120d0b]/80 px-4 py-3 text-sm">
                        {customerDetails.location ? (
                          <p className="font-semibold text-accent">Location captured successfully.</p>
                        ) : (
                          <p className="text-ink-muted">Location not added yet.</p>
                        )}
                      </div>
                      {customerLocationError && (
                        <p className="mt-3 text-xs font-semibold text-primary">{customerLocationError}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Payment Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        {CHECKOUT_PAYMENT_OPTIONS.map(method => (
                          <button
                            key={method}
                            onClick={() => {
                              setCheckoutError('');
                              setCustomerDetails(prev => ({ ...prev, payment: method }));
                            }}
                            className={`rounded-[24px] border px-4 py-4 text-left transition-all ${
                              customerDetails.payment === method
                                ? 'border-secondary/40 bg-[linear-gradient(135deg,rgba(111,78,55,0.52),rgba(62,39,35,0.96))] text-white shadow-[0_16px_32px_rgba(62,39,35,0.24)]'
                                : 'border-white/10 bg-white/5 text-ink-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {method === 'Pay Online' ? <CreditCard size={17} className="text-highlight" /> : <Wallet size={17} className="text-secondary" />}
                              <p className="text-sm font-semibold">{method}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {checkoutError && (
                      <div className="rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                        {checkoutError}
                      </div>
                    )}
                  </div>
                )}

                {checkoutStep === 'success' && (
                  <div className="py-10 text-center">
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-500/14 text-emerald-400"
                    >
                      <Coffee size={28} className="absolute text-accent/70" />
                      <CheckCircle2 size={42} className="relative z-10" />
                    </motion.div>
                    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                      <Sparkles size={13} />
                      Freshly confirmed
                    </div>
                    <h2 className="mt-5 text-[1.75rem] font-semibold text-accent">Order confirmed</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">Your order #{orderStatus?.id} is being prepared.</p>
                    <p className="mt-2 text-sm font-semibold text-secondary">
                      {orderStatus?.payment_method === 'razorpay' ? 'Payment received successfully.' : 'Cash on delivery selected.'}
                    </p>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        setCheckoutStep('cart');
                        setActiveTab('tracking');
                        setDraftOrderId('');
                      }}
                      className="coffee-btn-primary mt-8 w-full"
                    >
                      <Clock size={16} />
                      Track order
                    </button>
                  </div>
                )}
              </div>

              {checkoutStep !== 'success' && (
                <div className="border-t border-white/6 bg-[#0f0b09]/94 px-5 py-4">
                  {checkoutStep === 'cart' ? (
                    hasCartItems ? (
                      <button
                        onClick={() => {
                          setCheckoutError('');
                          setCheckoutStep('details');
                        }}
                        disabled={!hasCartItems}
                        className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                      >
                        <ArrowRight size={16} />
                        Proceed to checkout
                      </button>
                    ) : null
                  ) : (
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setCheckoutError('');
                          setCheckoutStep('cart');
                        }}
                        className="coffee-btn-secondary w-[36%] justify-center"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => void handlePlaceOrder()}
                        disabled={isPlacingOrder || !hasCartItems}
                        className="coffee-btn-primary flex-grow justify-center disabled:opacity-70"
                      >
                        {checkoutPrimaryActionLabel}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <BrewingOverlay visible={isPlacingOrder && checkoutStep !== 'success'} />
    </div>
  );
}
