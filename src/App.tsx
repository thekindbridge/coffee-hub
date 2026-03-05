/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Home, 
  Menu as MenuIcon, 
  ShoppingBag, 
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
  Filter
} from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import {
  collection,
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
import { db } from './firebase';
import { MenuItem, CartItem, Order, OrderItem } from './types';
import AdminDashboard from './components/AdminDashboard';
import MyOrders from './components/MyOrders';

// --- Components ---

const ORDER_STATUSES: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
const ORDER_ITEMS_IN_QUERY_LIMIT = 10;
const GUEST_USER_ID_STORAGE_KEY = 'coffe_hub_guest_user_id';

const getOrCreateGuestUserId = () => {
  if (typeof window === 'undefined') {
    return 'guest-user';
  }

  const existingUserId = window.localStorage.getItem(GUEST_USER_ID_STORAGE_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  const generatedUserId = `guest-${Math.random().toString(36).slice(2, 12)}`;
  window.localStorage.setItem(GUEST_USER_ID_STORAGE_KEY, generatedUserId);
  return generatedUserId;
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

  return {
    id: ((data.orderId as string) || snapshot.id).toUpperCase(),
    doc_id: snapshot.id,
    customer_name: (data.name as string) || '',
    phone: (data.phone as string) || '',
    address: (data.address as string) || '',
    total_amount: Number(data.total || 0),
    status: (data.status as Order['status']) || 'Placed',
    payment_method: (data.paymentMethod as string) || 'UPI',
    created_at: createdAtValue?.toDate()?.toISOString() || new Date().toISOString(),
    user_id: (data.userId as string) || '',
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

const SteamEffect = () => (
  <div className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none">
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="w-1 h-4 bg-white/20 rounded-full blur-sm steam-particle"
        style={{ left: `${(i - 1) * 10}px`, animationDelay: `${i * 0.5}s` }}
      />
    ))}
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
              <Plus size={18} /> Add
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'offers' | 'orders' | 'cart' | 'tracking' | 'about' | 'contact' | 'admin'>('home');
  const [currentUserId] = useState(() => getOrCreateGuestUserId());
  const isAdmin = true;
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
  const previousAdminOrderCountRef = useRef(0);
  const hasInitializedAdminOrdersRef = useRef(false);
  const orderAlertAudioRef = useRef<HTMLAudioElement | null>(null);
  const adminOrdersSnapshotVersionRef = useRef(0);
  const userOrdersSnapshotVersionRef = useRef(0);

  useEffect(() => {
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
  }, []);

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
    if (!isAdmin) {
      setAdminOrders([]);
      setNewOrderDocIds([]);
      previousAdminOrderCountRef.current = 0;
      hasInitializedAdminOrdersRef.current = false;
      adminOrdersSnapshotVersionRef.current = 0;
      return;
    }

    if (!orderAlertAudioRef.current) {
      orderAlertAudioRef.current = new Audio('/order-alert.mp3');
      orderAlertAudioRef.current.preload = 'auto';
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
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

          if (addedOrderDocIds.length > 0) {
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
  }, [isAdmin]);

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
    try {
      await updateDoc(doc(db, 'orders', orderDocId), { status });
      setAdminOrders(prev => prev.map(order => (
        order.doc_id === orderDocId ? { ...order, status } : order
      )));
      setNewOrderDocIds(prev => prev.filter(id => id !== orderDocId));
      setOrderStatus(prev => (
        prev && prev.doc_id === orderDocId ? { ...prev, status } : prev
      ));
    } catch (error) {
      console.error('Failed to update order status', error);
      alert('Unable to update order status right now.');
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

    setIsPlacingOrder(true);

    try {
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
        status: 'Placed',
        total: cartTotal,
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
        total_amount: cartTotal,
        status: 'Placed',
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
            <span className="text-accent font-bold tracking-widest uppercase text-sm mb-2 block">Authentic Indo-Chinese</span>
            <h1 className="text-5xl md:text-7xl font-display font-black leading-[0.9] mb-6">
              HOT WOK.<br />
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

      {/* Offers Banner */}
      <div className="px-6 -mt-10 relative z-20">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-accent rounded-3xl p-6 flex items-center justify-between text-black overflow-hidden relative"
        >
          <div className="relative z-10">
            <h3 className="font-black text-2xl">🔥 20% OFF</h3>
            <p className="font-bold opacity-80">On orders above ₹299</p>
          </div>
          <div className="bg-black text-white px-4 py-2 rounded-xl font-black text-sm relative z-10">
            USE: WOK20
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-20">
            <Tag size={120} />
          </div>
        </motion.div>
      </div>

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
                cartQuantity={cart.find(i => i.id === item.id)?.quantity || 0} 
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
      
      {[
        { title: '🔥 10% OFF on Noodles', desc: 'Valid on all noodle items', code: 'NOODLE10', color: 'bg-primary' },
        { title: '🔥 Free Manchurian', desc: 'On orders above ₹399', code: 'FREEBALLS', color: 'bg-accent' },
        { title: '🔥 Combo Discount', desc: 'Flat ₹50 off on combos', code: 'COMBO50', color: 'bg-emerald-500' },
      ].map(offer => (
        <motion.div 
          key={offer.code}
          whileHover={{ scale: 1.02 }}
          className={`${offer.color} rounded-3xl p-6 text-black flex justify-between items-center`}
        >
          <div>
            <h3 className="font-black text-xl">{offer.title}</h3>
            <p className="font-bold opacity-70">{offer.desc}</p>
          </div>
          <div className="bg-black/20 backdrop-blur-md border border-black/10 px-4 py-2 rounded-xl font-black text-sm">
            {offer.code}
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderMenu = () => (
    <div className="pt-20 pb-24 px-6">
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
            cartQuantity={cart.find(i => i.id === item.id)?.quantity || 0} 
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
                { label: 'Order Placed', status: 'Placed', icon: CheckCircle2 },
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
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('admin')}
            title="Open Admin Dashboard"
            className="w-10 h-10 rounded-full flex items-center justify-center border transition-colors bg-accent/20 border-accent text-accent"
          >
            <User size={20} />
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
        {activeTab === 'admin' && isAdmin && (
          <AdminDashboard
            isAdmin={isAdmin}
            orders={adminOrders}
            newOrderDocIds={newOrderDocIds}
            orderStatuses={ORDER_STATUSES}
            onUpdateStatus={(orderDocId, status) => {
              void updateOrderStatus(orderDocId, status);
            }}
            onLogout={() => {
              setActiveTab('home');
            }}
          />
        )}
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
            <span>₹{cartTotal}</span>
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
            ...(isAdmin
              ? [{
                  id: 'admin',
                  icon: User,
                  label: 'Admin',
                  active: activeTab === 'admin',
                  onClick: () => setActiveTab('admin'),
                }]
              : []),
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
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-bold">{item.name}</h4>
                          <p className="text-primary font-bold">₹{item.price}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center bg-white/5 rounded-xl p-1 gap-3">
                              <button onClick={() => handleAddToCart(item, -1)} className="p-1 hover:bg-white/10 rounded-lg">
                                <Minus size={14} />
                              </button>
                              <span className="font-bold text-sm">{item.quantity}</span>
                              <button onClick={() => handleAddToCart(item, 1)} className="p-1 hover:bg-white/10 rounded-lg">
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="font-black">₹{item.price * item.quantity}</div>
                      </div>
                    ))}
                    
                    <div className="pt-6 border-t border-white/5 space-y-2">
                      <div className="flex justify-between text-ink-muted">
                        <span>Subtotal</span>
                        <span>₹{cartTotal}</span>
                      </div>
                      <div className="flex justify-between text-ink-muted">
                        <span>Delivery Fee</span>
                        <span className="text-emerald-500">FREE</span>
                      </div>
                      <div className="flex justify-between text-xl font-black pt-2">
                        <span>Total</span>
                        <span className="text-primary">₹{cartTotal}</span>
                      </div>
                    </div>
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
                    <button 
                      onClick={() => setCheckoutStep('details')}
                      className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2"
                    >
                      PROCEED TO CHECKOUT <ArrowRight size={20} />
                    </button>
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
                        disabled={isPlacingOrder}
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


