import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { FirebaseError } from 'firebase/app';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import {
  createAgentTracker,
  type AgentTrackerPermissionState,
  type AgentTrackerStatus,
} from '../../../agent/agentTracker';
import type {
  DeliveryAgent,
  DeliveryLocation,
  DeliverySession,
  MenuItem,
  Order,
} from '../../../types';
import { ADMIN_EMAIL, DEFAULT_TRACKER_STATUS } from '../lib/constants';
import {
  EMPTY_PROFILE,
  EMPTY_STAFF_PROFILE,
  fetchOrderItemsMap,
  mapDeliveryAgentDocToAgent,
  mapDeliverySessionDocToSession,
  mapMenuDocToMenuItem,
  mapOrderDocToOrder,
  mapProfileDocToProfile,
  mapStaffProfileDocToProfile,
} from '../lib/firestoreMappers';
import type { AccessEntry, CustomerProfile, StaffProfile, StaffRole } from '../types';

type RealtimeAppData = {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  currentUserId: string;
  currentUserEmail: string;
  normalizedCurrentEmail: string;
  isAdmin: boolean;
  isDeliveryAgent: boolean;
  isMainAdmin: boolean;
  adminOrders: Order[];
  setAdminOrders: Dispatch<SetStateAction<Order[]>>;
  newOrderDocIds: string[];
  setNewOrderDocIds: Dispatch<SetStateAction<string[]>>;
  deliveryAgents: DeliveryAgent[];
  deliverySessions: DeliverySession[];
  userOrders: Order[];
  setUserOrders: Dispatch<SetStateAction<Order[]>>;
  isUserOrdersLoading: boolean;
  menu: MenuItem[];
  isMenuLoading: boolean;
  profileSaved: CustomerProfile;
  staffProfileSaved: StaffProfile;
  adminAccessEntries: AccessEntry[];
  deliveryAccessEntries: AccessEntry[];
  agentTrackerRef: MutableRefObject<ReturnType<typeof createAgentTracker> | null>;
  trackedOrderIdRef: MutableRefObject<string>;
  isAgentTracking: boolean;
  setIsAgentTracking: Dispatch<SetStateAction<boolean>>;
  agentPermissionState: AgentTrackerPermissionState;
  setAgentPermissionState: Dispatch<SetStateAction<AgentTrackerPermissionState>>;
  agentTrackerStatus: AgentTrackerStatus;
  setAgentTrackerStatus: Dispatch<SetStateAction<AgentTrackerStatus>>;
  agentLastTrackedLocation: DeliveryLocation | null;
  setAgentLastTrackedLocation: Dispatch<SetStateAction<DeliveryLocation | null>>;
  currentDeliveryAgent: DeliveryAgent | null;
  currentDeliverySession: DeliverySession | null;
  currentDeliveryOrder: Order | null;
};

export const useRealtimeAppData = (): RealtimeAppData => {
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
  const [profileSaved, setProfileSaved] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [staffProfileSaved, setStaffProfileSaved] = useState<StaffProfile>(
    EMPTY_STAFF_PROFILE,
  );
  const [adminAccessEntries, setAdminAccessEntries] = useState<AccessEntry[]>([]);
  const [deliveryAccessEntries, setDeliveryAccessEntries] = useState<AccessEntry[]>(
    [],
  );
  const previousAdminOrderCountRef = useRef(0);
  const hasInitializedAdminOrdersRef = useRef(false);
  const orderAlertAudioRef = useRef<HTMLAudioElement | null>(null);
  const adminOrdersSnapshotVersionRef = useRef(0);
  const userOrdersSnapshotVersionRef = useRef(0);
  const agentTrackerRef = useRef<ReturnType<typeof createAgentTracker> | null>(null);
  const trackedOrderIdRef = useRef('');
  const [isAgentTracking, setIsAgentTracking] = useState(false);
  const [agentPermissionState, setAgentPermissionState] =
    useState<AgentTrackerPermissionState>('unavailable');
  const [agentTrackerStatus, setAgentTrackerStatus] =
    useState<AgentTrackerStatus>(DEFAULT_TRACKER_STATUS);
  const [agentLastTrackedLocation, setAgentLastTrackedLocation] =
    useState<DeliveryLocation | null>(null);

  const normalizedCurrentEmail = currentUserEmail.trim().toLowerCase();
  const isMainAdmin = normalizedCurrentEmail === ADMIN_EMAIL;

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
          .flatMap(docSnapshot => {
            const data = docSnapshot.data() as Record<string, unknown>;
            const emailValue = ((data.email as string) || docSnapshot.id || '')
              .trim()
              .toLowerCase();
            if (!emailValue) {
              return [];
            }

            return [{
              id: docSnapshot.id,
              email: emailValue,
              role: 'admin',
            } satisfies AccessEntry];
          })
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
          .flatMap(docSnapshot => {
            const data = docSnapshot.data() as Record<string, unknown>;
            const emailValue = ((data.email as string) || '').trim().toLowerCase();
            if (!emailValue) {
              return [];
            }

            return [{
              id: docSnapshot.id,
              email: emailValue,
              role: ((data.role as AccessEntry['role']) || 'delivery'),
              accessOnly: data.accessOnly === true,
            } satisfies AccessEntry];
          })
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
    if (!isLoggedIn) {
      setMenu([]);
      setIsMenuLoading(false);
      return;
    }

    setIsMenuLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'menu_items'),
      snapshot => {
        const firestoreMenuItems = snapshot.docs
          .map(mapMenuDocToMenuItem)
          .filter(item => item.is_available);
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
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUserId),
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
    const canAccessStaffProfile = isAdmin || isDeliveryAgent;
    if (!currentUserId || !canAccessStaffProfile) {
      const fallbackRole: StaffRole = isAdmin ? 'admin' : 'agent';
      setStaffProfileSaved({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
      return;
    }

    const fallbackRole: StaffRole = isAdmin ? 'admin' : 'agent';
    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUserId),
      snapshot => {
        if (!snapshot.exists()) {
          setStaffProfileSaved({ ...EMPTY_STAFF_PROFILE, role: fallbackRole });
          return;
        }

        setStaffProfileSaved(
          mapStaffProfileDocToProfile(
            snapshot.data() as Record<string, unknown>,
            fallbackRole,
          ),
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
    const unsubscribe = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
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
        setDeliverySessions(snapshot.docs.map(mapDeliverySessionDocToSession));
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

  const currentDeliveryAgent = useMemo(() => {
    if (!normalizedCurrentEmail) {
      return null;
    }

    return deliveryAgents.find(agent => {
      const agentEmail = agent.email?.trim().toLowerCase() || '';
      return agent.id === normalizedCurrentEmail || agentEmail === normalizedCurrentEmail;
    }) || null;
  }, [deliveryAgents, normalizedCurrentEmail]);

  const currentDeliverySession = useMemo(() => {
    const activeSessions = deliverySessions.filter(session => {
      const sessionOrder = adminOrders.find(order => order.id === session.order_id);
      return Boolean(
        sessionOrder &&
          sessionOrder.status === 'Out for Delivery' &&
          session.status !== 'completed',
      );
    });

    const matchingSessionByOrder = activeSessions.find(
      session => session.order_id === currentDeliveryAgent?.current_order_id,
    );
    if (matchingSessionByOrder) {
      return matchingSessionByOrder;
    }

    const matchingSessionByAgent = activeSessions.find(
      session => session.agent_id === currentDeliveryAgent?.id && session.status !== 'completed',
    );
    if (matchingSessionByAgent) {
      return matchingSessionByAgent;
    }

    return activeSessions.find(session => {
      const sessionOrder = adminOrders.find(order => order.id === session.order_id);
      return sessionOrder?.delivery_agent_email?.trim().toLowerCase() === normalizedCurrentEmail;
    }) || null;
  }, [adminOrders, currentDeliveryAgent?.current_order_id, currentDeliveryAgent?.id, deliverySessions, normalizedCurrentEmail]);

  const currentDeliveryOrder = useMemo(() => {
    const targetOrderId = currentDeliverySession?.order_id || currentDeliveryAgent?.current_order_id;
    if (targetOrderId) {
      return adminOrders.find(order => order.id === targetOrderId) || null;
    }

    return adminOrders.find(
      order =>
        order.status === 'Out for Delivery' &&
        (
          order.delivery_agent_id === currentDeliveryAgent?.id ||
          order.delivery_agent_email?.trim().toLowerCase() === normalizedCurrentEmail
        ),
    ) || null;
  }, [
    adminOrders,
    currentDeliveryAgent?.id,
    currentDeliveryAgent?.current_order_id,
    currentDeliverySession?.order_id,
    normalizedCurrentEmail,
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

  return {
    isLoggedIn,
    isAuthReady,
    currentUserId,
    currentUserEmail,
    normalizedCurrentEmail,
    isAdmin,
    isDeliveryAgent,
    isMainAdmin,
    adminOrders,
    setAdminOrders,
    newOrderDocIds,
    setNewOrderDocIds,
    deliveryAgents,
    deliverySessions,
    userOrders,
    setUserOrders,
    isUserOrdersLoading,
    menu,
    isMenuLoading,
    profileSaved,
    staffProfileSaved,
    adminAccessEntries,
    deliveryAccessEntries,
    agentTrackerRef,
    trackedOrderIdRef,
    isAgentTracking,
    setIsAgentTracking,
    agentPermissionState,
    setAgentPermissionState,
    agentTrackerStatus,
    setAgentTrackerStatus,
    agentLastTrackedLocation,
    setAgentLastTrackedLocation,
    currentDeliveryAgent,
    currentDeliverySession,
    currentDeliveryOrder,
  };
};
