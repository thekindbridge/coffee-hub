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
  Search
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
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { MenuItem, CartItem, Order, OrderItem } from './types';
import { useOffers } from './hooks/useOffers';
import { calculateDiscount } from './utils/calculateDiscount';
import AdminDashboard from './components/AdminDashboard';
import AgentDashboard from './components/AgentDashboard';
import MyOrders from './components/MyOrders';

// --- Components ---

const ORDER_STATUSES: Order['status'][] = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
const ORDER_ITEMS_IN_QUERY_LIMIT = 10;
const ADMIN_EMAIL = 'thekindbridge@gmail.com';
const DELIVERY_AGENT_EMAIL = 'pavankumarnaidu343@gmail.com';
const CURRENCY_SYMBOL = '\u20B9';
const STANDARD_DELIVERY_FEE = 30;
const FREE_DELIVERY_THRESHOLD = 499;
const AUTH_BACKGROUND_IMAGE = 'url(https://res.cloudinary.com/ddfhaqeme/image/upload/v1772713816/5f272fcd-02a1-4f33-b91c-9ff009e08610_z4faz2.jpg)';
const DEFAULT_DELIVERY_AGENT = {
  id: 'INKOLLU_AGENT_01',
  name: 'Inkollu Delivery Agent',
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
  const finalTotal = Number(data.finalTotal ?? data.total ?? Math.max(0, subtotal - discount));

  return {
    id: ((data.orderId as string) || snapshot.id).toUpperCase(),
    doc_id: snapshot.id,
    customer_name: (data.name as string) || '',
    phone: (data.phone as string) || '',
    address: (data.address as string) || '',
    total_amount: finalTotal,
    subtotal,
    discount,
    coupon_code: ((data.couponCode as string) || '').toUpperCase(),
    final_total: finalTotal,
    status: normalizeOrderStatus(data.status),
    payment_method: (data.paymentMethod as string) || 'UPI',
    created_at: createdAtValue?.toDate()?.toISOString() || new Date().toISOString(),
    user_id: (data.userId as string) || '',
    delivery_agent_id: (data.deliveryAgentId as string) || '',
    delivery_agent_name: (data.deliveryAgentName as string) || '',
    delivery_assigned_at: ((data.deliveryAssignedAt as Timestamp | undefined)?.toDate()?.toISOString()) || '',
  };
};

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
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isUserOrdersLoading, setIsUserOrdersLoading] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
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
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    address: '',
    payment: 'UPI'
  });
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
        const normalizedEmail = email.toLowerCase();
        setIsLoggedIn(true);
        setCurrentUserId(user.uid);
        setCurrentUserEmail(email);
        setIsAdmin(normalizedEmail === ADMIN_EMAIL);
        setIsDeliveryAgent(normalizedEmail === DELIVERY_AGENT_EMAIL);
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
    if (!isLoggedIn) {
      setMenu([]);
      return;
    }

    const menuQuery = collection(db, 'menu_items');
    const unsubscribe = onSnapshot(
      menuQuery,
      snapshot => {
        const firestoreMenuItems = snapshot.docs.map(mapMenuDocToMenuItem).filter(item => item.is_available);
        setMenu(firestoreMenuItems);
      },
      error => {
        console.error('Failed to subscribe to menu items', error);
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
      const isSameItemsRef = prev.items === mergedItems;

      if (isSameStatus && isSameTotal && isSameAddress && isSameItemsRef) {
        return prev;
      }

      return {
        ...syncedOrder,
        items: mergedItems,
      };
    });
  }, [orderStatus?.id, userOrders]);

  const updateOrderStatus = async (orderDocId: string, status: Order['status']) => {
    const normalizedStatus = normalizeOrderStatus(status);
    const shouldAssignDeliveryAgent = normalizedStatus === 'Out for Delivery';
    const isDeliveredStatus = normalizedStatus === 'Delivered';

    const statusPayload: Record<string, unknown> = {
      status: normalizedStatus,
      deliveryAgentId: shouldAssignDeliveryAgent ? DEFAULT_DELIVERY_AGENT.id : deleteField(),
      deliveryAgentName: shouldAssignDeliveryAgent ? DEFAULT_DELIVERY_AGENT.name : deleteField(),
      deliveryAssignedAt: shouldAssignDeliveryAgent || isDeliveredStatus ? serverTimestamp() : deleteField(),
    };

    try {
      await updateDoc(doc(db, 'orders', orderDocId), statusPayload);
      setAdminOrders(prev => prev.map(order => (
        order.doc_id === orderDocId
          ? {
            ...order,
            status: normalizedStatus,
            delivery_agent_id: shouldAssignDeliveryAgent ? DEFAULT_DELIVERY_AGENT.id : '',
            delivery_agent_name: shouldAssignDeliveryAgent ? DEFAULT_DELIVERY_AGENT.name : '',
            delivery_assigned_at: shouldAssignDeliveryAgent || isDeliveredStatus ? new Date().toISOString() : '',
          }
          : order
      )));
      setNewOrderDocIds(prev => prev.filter(id => id !== orderDocId));
      setOrderStatus(prev => (
        prev && prev.doc_id === orderDocId
          ? {
            ...prev,
            status: normalizedStatus,
            delivery_agent_id: shouldAssignDeliveryAgent ? DEFAULT_DELIVERY_AGENT.id : '',
            delivery_agent_name: shouldAssignDeliveryAgent ? DEFAULT_DELIVERY_AGENT.name : '',
            delivery_assigned_at: shouldAssignDeliveryAgent || isDeliveredStatus ? new Date().toISOString() : '',
          }
          : prev
      ));
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
      await signOut(auth);
      setActiveTab('home');
    } catch (error) {
      console.error('Logout failed', error);
      alert('Unable to log out right now.');
    }
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

    return cartTotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  }, [cartTotal, hasCartItems]);
  const payableCartTotal = useMemo(
    () => Number((finalCartTotal + deliveryFee).toFixed(2)),
    [deliveryFee, finalCartTotal],
  );

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

  const handlePlaceOrder = async () => {
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.address) {
      alert("Please fill all details");
      return;
    }

    if (cart.length === 0) {
      return;
    }

    if (!currentUserId) {
      alert('Please sign in with Google to place an order.');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const subtotalValue = cartTotal;
      const deliveryFeeValue = subtotalValue >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
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

      const orderId = await getNextOrderId();
      const orderRef = doc(collection(db, 'orders'));
      const batch = writeBatch(db);

      batch.set(orderRef, {
        orderId,
        userId: currentUserId,
        name: customerDetails.name,
        phone: customerDetails.phone,
        address: customerDetails.address,
        paymentMethod: customerDetails.payment,
        status: 'Pending',
        subtotal: subtotalValue,
        discount: discountValue,
        deliveryFee: deliveryFeeValue,
        couponCode: couponCodeValue,
        finalTotal: finalTotalValue,
        total: finalTotalValue,
        createdAt: serverTimestamp(),
      });

      for (const item of cart) {
        const orderItemRef = doc(collection(db, 'order_items'));
        batch.set(orderItemRef, {
          orderId,
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        });
      }

      await batch.commit();

      setOrderStatus({
        id: orderId,
        doc_id: orderRef.id,
        customer_name: customerDetails.name,
        phone: customerDetails.phone,
        address: customerDetails.address,
        total_amount: finalTotalValue,
        subtotal: subtotalValue,
        discount: discountValue,
        coupon_code: couponCodeValue,
        final_total: finalTotalValue,
        status: 'Pending',
        payment_method: customerDetails.payment,
        created_at: new Date().toISOString(),
        user_id: currentUserId,
        items: cart.map(item => ({
          id: item.id,
          order_id: orderId,
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      setTrackingOrderId(orderId);
      setCheckoutStep('success');
      setCart([]);
      setAppliedCouponCode('');
      setCouponInput('');
      setCouponError('');
      setCouponSuccess('');
    } catch (error) {
      console.error('Failed to place order', error);
      alert('Unable to place order right now. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const renderHome = () => (
    <div className="pb-24">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1512058560366-cd242d4235cd?auto=format&fit=crop&w=1920&q=80" 
            alt="Hero" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-primary font-bold tracking-widest uppercase text-sm mb-2 block">COFFEE HUB - INKOLLU</span>
            <h1 className="text-5xl md:text-7xl font-display font-black leading-[0.9] mb-6">HOT WOK.<br />
              <span className="text-primary">FRESH FLAVORS.</span><br />
              DELIVERED FAST.
            </h1>
            <button 
              onClick={() => setActiveTab('menu')}
              className="bg-primary hover:bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              ORDER NOW <ArrowRight size={20} />
            </button>
          </motion.div>
        </div>
      </section>

      {activeOffers[0] && (
        <div className="relative z-20 -mt-10 px-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative flex items-center justify-between overflow-hidden rounded-3xl bg-accent p-6 text-black"
          >
            <div className="relative z-10">
              <h3 className="text-2xl font-black">{activeOffers[0].title}</h3>
              <p className="font-bold opacity-80">{activeOffers[0].description}</p>
            </div>
            <div className="relative z-10 rounded-xl bg-black px-4 py-2 text-sm font-black text-white">
              USE: {activeOffers[0].couponCode}
            </div>
            <motion.div
              className="absolute -bottom-4 -right-4 opacity-20"
              animate={{ rotate: [0, 8, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 2.6, repeat: Infinity }}
            >
              <Tag size={120} />
            </motion.div>
          </motion.div>
        </div>
      )}
      {/* Popular Items */}
      <section className="mt-12 px-6">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-black">Popular Items</h2>
          <button onClick={() => setActiveTab('menu')} className="text-primary font-bold flex items-center gap-1">
            View All <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
          {menu.slice(0, 5).map(item => (
            <div key={item.id} className="min-w-[240px]">
              <FoodCard 
                item={item} 
                onAdd={handleAddToCart} 
                cartQuantity={cartQuantityById.get(item.id) || 0} 
              />
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mt-12 px-6 grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4">
            <Clock size={24} />
          </div>
          <h4 className="font-bold mb-1">Fast Delivery</h4>
          <p className="text-xs text-ink-muted">Under 30 mins</p>
        </div>
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="font-bold mb-1">Hygiene First</h4>
          <p className="text-xs text-ink-muted">Safety certified</p>
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
            className="relative flex items-center justify-between overflow-hidden rounded-3xl border border-accent/20 bg-accent/90 p-6 text-black"
          >
            <div>
              <h3 className="text-xl font-black">{offer.title}</h3>
              <p className="font-bold opacity-80">{offer.description}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-wide">
                {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `FLAT Rs ${offer.discountValue} OFF`}
              </p>
            </div>
            <div className="rounded-xl bg-black/20 px-4 py-2 text-sm font-black">
              {offer.couponCode}
            </div>
            <motion.div
              className="absolute -bottom-4 -right-4 opacity-20"
              animate={{ rotate: [0, 8, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              <Tag size={120} />
            </motion.div>
          </motion.div>
        ))
      )}
    </div>
  );
  const renderMenu = () => (
    <div id="menu-section" className="pt-20 pb-24 px-6">
      <div className="sticky top-20 z-30 bg-background/80 backdrop-blur-xl -mx-6 px-6 py-4 border-b border-white/5">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search for noodles, rice..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                ? "bg-primary text-white" 
                : "bg-white/5 text-ink-muted hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {filteredMenu.map(item => (
          <FoodCard 
            key={item.id} 
            item={item} 
            onAdd={handleAddToCart} 
            cartQuantity={cartQuantityById.get(item.id) || 0} 
          />
        ))}
      </div>
      
      {filteredMenu.length === 0 && (
        <div className="py-20 text-center">
          <Search size={48} className="mx-auto text-ink-muted mb-4 opacity-20" />
          <p className="text-ink-muted">No items found matching your search.</p>
        </div>
      )}
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
              <p className="font-bold">Inkollu, Andhra Pradesh, India</p>
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

      <div className="rounded-[40px] overflow-hidden h-64 border border-white/10 grayscale contrast-125">
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15336.123456789!2d80.1234567!3d15.1234567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4b000000000001%3A0x0!2zSW5rb2xsdSwgQW5kaHJhIFByYWRlc2ggNTIzMTY3LCBJbmRpYQ!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin" 
          width="100%" 
          height="100%" 
          style={{ border: 0 }} 
          allowFullScreen 
          loading="lazy"
        />
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
      <div className="min-h-screen bg-background text-ink selection:bg-primary/30">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <User className="text-white" />
            </div>
            <span className="font-display font-black text-xl tracking-tighter">ADMIN <span className="text-primary">CONSOLE</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-bold text-ink-muted sm:block">{currentUserEmail}</span>
            <button
              onClick={() => {
                void handleLogout();
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto">
          <AdminDashboard
            orders={adminOrders}
            offers={offers}
            isOffersLoading={isOffersLoading}
            offersError={offersError}
            newOrderDocIds={newOrderDocIds}
            orderStatuses={ORDER_STATUSES}
            onUpdateStatus={(orderDocId, status) => {
              void updateOrderStatus(orderDocId, status);
            }}
            onCreateOffer={createOffer}
            onUpdateOffer={updateOffer}
            onDeleteOffer={deleteOffer}
            onToggleOfferStatus={toggleOfferStatus}
          />
        </main>
      </div>
    );
  }

  if (isDeliveryAgent) {
    return (
      <div className="min-h-screen bg-background text-ink selection:bg-primary/30">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <MapPin className="text-white" />
            </div>
            <span className="font-display font-black text-xl tracking-tighter">DELIVERY <span className="text-primary">PANEL</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-bold text-ink-muted sm:block">{currentUserEmail}</span>
            <button
              onClick={() => {
                void handleLogout();
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto">
          <AgentDashboard
            isAuthorized={currentUserEmail.toLowerCase() === DELIVERY_AGENT_EMAIL}
            orders={adminOrders}
            onMarkDelivered={orderDocId => {
              void updateOrderStatus(orderDocId, 'Delivered');
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-primary/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Flame className="text-white" fill="white" />
          </div>
          <span className="font-display font-black text-xl tracking-tighter">COFFE <span className="text-primary">HUB</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-bold text-ink-muted sm:block">{currentUserEmail}</span>
          <button
            onClick={() => {
              void handleLogout();
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-muted hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'menu' && renderMenu()}
        {activeTab === 'offers' && renderOffers()}
        {activeTab === 'orders' && (
          <MyOrders
            orders={userOrders}
            isLoading={isUserOrdersLoading}
            onBrowseMenu={() => setActiveTab('menu')}
          />
        )}
        {activeTab === 'tracking' && renderTracking()}
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
          className="fixed bottom-24 left-6 right-6 z-40 bg-primary text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl shadow-primary/40 font-black active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 px-2 py-1 rounded-lg text-xs">{cartCount} ITEMS</div>
            <span>VIEW CART</span>
          </div>
          <div className="flex items-center gap-1">
            <span>₹{payableCartTotal}</span>
            <ChevronRight size={20} />
          </div>
        </motion.button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-white/5 px-6 py-3">
        <div className="max-w-md mx-auto flex justify-between items-center">
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
            {
              id: 'cart',
              icon: ShoppingBag,
              label: 'Cart',
              active: isCartOpen,
              onClick: () => setIsCartOpen(true),
            },
          ].map(item => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-1 transition-all ${
                item.active ? "text-primary" : "text-ink-muted hover:text-ink"
              }`}
            >
              <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-[40px] border-t border-white/10 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 flex justify-between items-center border-b border-white/5">
                <h2 className="text-2xl font-black">Your Cart</h2>
                <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {checkoutStep === 'cart' && (
                  <>
                    {!hasCartItems ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex min-h-[320px] flex-col items-center justify-center text-center"
                      >
                        <p className="text-3xl font-black">{'\uD83D\uDED2'} Cart is Empty</p>
                        <p className="mt-2 text-ink-muted">
                          Add items from menu to start your order.
                        </p>
                        <button
                          onClick={handleBrowseMenu}
                          className="mt-6 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white"
                        >
                          Browse Menu
                        </button>
                      </motion.div>
                    ) : (
                      <>
                        {cart.map(item => (
                          <div key={item.id} className="flex gap-4">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-grow">
                              <h4 className="font-bold">{item.name}</h4>
                              <p className="text-primary font-bold">{CURRENCY_SYMBOL}{item.price}</p>
                              <div className="mt-2 flex items-center gap-4">
                                <div className="flex items-center bg-white/5 rounded-xl p-1 gap-3">
                                  <button onClick={() => handleAddToCart(item, -1)} className="p-1 hover:bg-white/10 rounded-lg">
                                    <Minus size={14} />
                                  </button>
                                  <span className="font-bold text-sm">{item.quantity}</span>
                                  <button onClick={() => handleAddToCart(item, 1)} className="p-1 hover:bg-white/10 rounded-lg">
                                    <Plus size={14} />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="text-xs font-bold uppercase tracking-wide text-ink-muted hover:text-white"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div className="font-black">{CURRENCY_SYMBOL}{item.price * item.quantity}</div>
                          </div>
                        ))}

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-muted">
                            Enter Coupon Code
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponInput}
                              onChange={e => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="e.g. SAVE20"
                              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none"
                            />
                            <button
                              onClick={() => void handleApplyCoupon()}
                              disabled={isApplyingCoupon || !hasCartItems}
                              className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-white disabled:opacity-60"
                            >
                              {isApplyingCoupon ? 'APPLYING...' : 'APPLY'}
                            </button>
                          </div>
                          {appliedCouponCode && (
                            <button
                              onClick={handleRemoveCoupon}
                              className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-muted hover:text-white"
                            >
                              Remove Coupon
                            </button>
                          )}
                          {couponError && <p className="mt-2 text-xs font-bold text-primary">{couponError}</p>}
                          <AnimatePresence mode="wait">
                            {couponSuccess && (
                              <motion.p
                                key={couponSuccess}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="mt-2 text-xs font-bold text-emerald-400"
                              >
                                {couponSuccess}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="space-y-2 border-t border-white/5 pt-6">
                          <div className="flex justify-between text-ink-muted">
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
                                className="flex justify-between text-emerald-400"
                              >
                                <span>Discount</span>
                                <span>-{CURRENCY_SYMBOL}{discountAmount}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="flex justify-between text-ink-muted">
                            <span>Delivery Fee</span>
                            {deliveryFee > 0 ? (
                              <span>{CURRENCY_SYMBOL}{deliveryFee}</span>
                            ) : (
                              <span className="font-bold text-emerald-400">FREE</span>
                            )}
                          </div>
                          {appliedCouponCode && (
                            <div className="flex justify-between text-ink-muted">
                              <span>Coupon Applied</span>
                              <span className="font-bold text-accent">{appliedCouponCode}</span>
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
                            className="flex justify-between pt-2 text-xl font-black"
                          >
                            <span>Final Total</span>
                            <span className="text-primary">{CURRENCY_SYMBOL}{payableCartTotal}</span>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </>
                )}
                {checkoutStep === 'details' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-ink-muted mb-2 block">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-primary"
                        value={customerDetails.name}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-ink-muted mb-2 block">Phone Number</label>
                      <input 
                        type="tel" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-primary"
                        value={customerDetails.phone}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-ink-muted mb-2 block">Delivery Address</label>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-primary h-24"
                        value={customerDetails.address}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-ink-muted mb-2 block">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['UPI', 'Card', 'Cash'].map(method => (
                          <button
                            key={method}
                            onClick={() => setCustomerDetails(prev => ({ ...prev, payment: method }))}
                            className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                              customerDetails.payment === method 
                              ? "bg-primary border-primary text-white" 
                              : "bg-white/5 border-white/10 text-ink-muted"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {checkoutStep === 'success' && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-black mb-2">Order Confirmed!</h2>
                    <p className="text-ink-muted mb-8">Your order #{orderStatus?.id} is being prepared.</p>
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        setCheckoutStep('cart');
                        setActiveTab('tracking');
                      }}
                      className="bg-primary text-white px-8 py-4 rounded-2xl font-black w-full"
                    >
                      TRACK ORDER
                    </button>
                  </div>
                )}
              </div>

              {checkoutStep !== 'success' && (
                <div className="p-6 border-t border-white/5">
                  {checkoutStep === 'cart' ? (
                    hasCartItems ? (
                      <button 
                        onClick={() => setCheckoutStep('details')}
                        disabled={!hasCartItems}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        PROCEED TO CHECKOUT <ArrowRight size={20} />
                      </button>
                    ) : null
                  ) : (
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setCheckoutStep('cart')}
                        className="w-1/3 bg-white/5 text-ink-muted py-4 rounded-2xl font-black"
                      >
                        BACK
                      </button>
                      <button 
                        onClick={() => void handlePlaceOrder()}
                        disabled={isPlacingOrder || !hasCartItems}
                        className="flex-grow bg-primary text-white py-4 rounded-2xl font-black text-lg disabled:opacity-70"
                      >
                        {isPlacingOrder ? 'PLACING ORDER...' : 'CONFIRM ORDER'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
