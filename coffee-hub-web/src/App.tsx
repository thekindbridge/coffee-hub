import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Coffee,
  Home,
  MapPin,
  Menu as MenuIcon,
  Tag,
  User,
} from 'lucide-react';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { loginWithGoogle } from './auth';
import type { MenuItem, Offer, Order } from './types';
import { useOffers } from './hooks/useOffers';
import AdminDashboard from './components/AdminDashboard';
import AgentDashboard from './components/AgentDashboard';
import MyOrders from './components/MyOrders';
import { CURRENCY_SYMBOL, ORDER_STATUSES } from './features/app/lib/constants';
import {
  buildProfileDraft,
  buildStaffProfileDraft,
  EMPTY_PROFILE,
  EMPTY_STAFF_PROFILE,
  ensureProfileAddresses,
  formatPhoneWithPrefix,
} from './features/app/lib/firestoreMappers';
import { useRealtimeAppData } from './features/app/hooks/useRealtimeAppData';
import { useOrderOperations } from './features/app/hooks/useOrderOperations';
import type {
  AccessEntry,
  CustomerProfile,
  CustomerTab,
  StaffProfile,
  StaffRole,
} from './features/app/types';
import { useCheckoutFlow } from './features/customer/hooks/useCheckoutFlow';
import { AuthLoadingPage } from './features/customer/pages/AuthLoadingPage';
import { LoginPage } from './features/customer/pages/LoginPage';
import { HomePage } from './features/customer/pages/HomePage';
import { OffersPage } from './features/customer/pages/OffersPage';
import { MenuPage } from './features/customer/pages/MenuPage';
import { TrackingExperiencePage } from './features/customer/pages/TrackingExperiencePage';
import { AboutPage } from './features/customer/pages/AboutPage';
import { ContactPage } from './features/customer/pages/ContactPage';
import { CustomerProfileDrawer } from './features/customer/components/CustomerProfileDrawer';
import { CartDrawer } from './features/customer/components/CartDrawer';
import { BrewingOverlay } from './features/customer/components/BrewingOverlay';
import { StaffProfileDrawer } from './features/staff/components/StaffProfileDrawer';

export default function App() {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');
  const [orderStatus, setOrderStatus] = useState<Order | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [isTrackingOrder, setIsTrackingOrder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [isProfileAddressExpanded, setIsProfileAddressExpanded] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isProfileSavedToastVisible, setIsProfileSavedToastVisible] = useState(false);
  const [isStaffProfileOpen, setIsStaffProfileOpen] = useState(false);
  const [staffProfileDraft, setStaffProfileDraft] = useState<StaffProfile>(EMPTY_STAFF_PROFILE);
  const [staffProfileError, setStaffProfileError] = useState('');
  const [isStaffProfileSaving, setIsStaffProfileSaving] = useState(false);
  const [isStaffProfileSavedToastVisible, setIsStaffProfileSavedToastVisible] = useState(false);
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

  const appData = useRealtimeAppData();
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
  } = useOffers({ includeInactive: appData.isAdmin });

  const checkout = useCheckoutFlow({
    currentUserId: appData.currentUserId,
    currentUserEmail: appData.currentUserEmail,
    profileSaved: appData.profileSaved,
    findActiveOfferByCode,
    onBrowseMenu: () => setActiveTab('menu'),
    onOrderPlaced: nextOrder => {
      setOrderStatus(nextOrder);
      setTrackingOrderId(nextOrder.id);
    },
  });

  const orderOperations = useOrderOperations({
    adminOrders: appData.adminOrders,
    setAdminOrders: appData.setAdminOrders,
    userOrders: appData.userOrders,
    setUserOrders: appData.setUserOrders,
    orderStatus,
    setOrderStatus,
    setNewOrderDocIds: appData.setNewOrderDocIds,
    currentDeliveryOrder: appData.currentDeliveryOrder,
    currentDeliveryAgent: appData.currentDeliveryAgent,
    normalizedCurrentEmail: appData.normalizedCurrentEmail,
    agentTrackerRef: appData.agentTrackerRef,
    trackedOrderIdRef: appData.trackedOrderIdRef,
    setIsAgentTracking: appData.setIsAgentTracking,
    setAgentPermissionState: appData.setAgentPermissionState,
    setAgentTrackerStatus: appData.setAgentTrackerStatus,
    agentLastTrackedLocation: appData.agentLastTrackedLocation,
    setAgentLastTrackedLocation: appData.setAgentLastTrackedLocation,
    onAfterLogout: () => setActiveTab('home'),
  });

  useEffect(() => {
    if (!appData.isLoggedIn) {
      setActiveTab('home');
      setOrderStatus(null);
      setTrackingOrderId('');
      setTrackingError('');
    }
  }, [appData.isLoggedIn]);

  useEffect(() => {
    if (!orderStatus) {
      return;
    }

    const syncedOrder = appData.userOrders.find(order => order.id === orderStatus.id);
    if (!syncedOrder) {
      return;
    }

    setOrderStatus(prev => {
      if (!prev || prev.id !== syncedOrder.id) {
        return prev;
      }

      const mergedItems =
        syncedOrder.items && syncedOrder.items.length > 0
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
  }, [appData.userOrders, orderStatus]);

  useEffect(() => {
    if (!isProfileOpen) {
      setProfileDraft(buildProfileDraft(appData.profileSaved));
      setIsProfileAddressExpanded(false);
    }
  }, [appData.profileSaved, isProfileOpen]);

  useEffect(() => {
    if (!isStaffProfileOpen) {
      setStaffProfileDraft(buildStaffProfileDraft(appData.staffProfileSaved));
      setStaffProfileError('');
      setIsStaffProfileSavedToastVisible(false);
    }
  }, [appData.staffProfileSaved, isStaffProfileOpen]);

  useEffect(() => {
    if (!isProfileSavedToastVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsProfileSavedToastVisible(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isProfileSavedToastVisible]);

  useEffect(() => {
    if (!isStaffProfileOpen) {
      document.body.style.overflow = 'auto';
      return;
    }

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isStaffProfileOpen]);

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
    if (checkout.checkoutStep !== 'success' || !orderStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      checkout.setIsCartOpen(false);
      checkout.setCheckoutStep('cart');
      setActiveTab('tracking');
      checkout.setDraftOrderId('');
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    checkout.checkoutStep,
    checkout.setCheckoutStep,
    checkout.setDraftOrderId,
    checkout.setIsCartOpen,
    orderStatus,
  ]);

  const categories = useMemo(
    () => ['All', ...new Set(appData.menu.map(item => item.category))],
    [appData.menu],
  );
  const filteredMenu = useMemo(
    () =>
      appData.menu.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [appData.menu, searchQuery, selectedCategory],
  );

  const handleTrackOrderLookup = () => {
    const orderId = trackingOrderId.trim().toUpperCase();
    if (!orderId) {
      setTrackingError('Enter your order ID to track it.');
      return;
    }

    setTrackingError('');
    setIsTrackingOrder(true);

    const matchedOrder = appData.userOrders.find(order => order.id === orderId);
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

  const handleOpenProfile = () => {
    setProfileDraft(buildProfileDraft(appData.profileSaved));
    setIsProfileAddressExpanded(false);
    setProfileError('');
    setIsProfileSavedToastVisible(false);
    setIsProfileOpen(true);
    checkout.setIsCartOpen(false);
  };

  const handleOpenStaffProfile = () => {
    const role: StaffRole = appData.isAdmin ? 'admin' : 'agent';
    const seededEmail = appData.staffProfileSaved.email || appData.currentUserEmail;
    setStaffProfileDraft(
      buildStaffProfileDraft({
        ...appData.staffProfileSaved,
        role,
        email: seededEmail,
      }),
    );
    setStaffProfileError('');
    setIsStaffProfileSavedToastVisible(false);
    setAdminAccessError('');
    setDeliveryAccessError('');
    setAdminAccessSuccess('');
    setDeliveryAccessSuccess('');
    setIsStaffProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!appData.currentUserId) {
      setProfileError('Please sign in to save your profile.');
      return;
    }

    setIsProfileSaving(true);
    setProfileError('');
    try {
      const trimmedAddresses = ensureProfileAddresses(profileDraft.addresses).map(address =>
        address.trim(),
      );
      await setDoc(
        doc(db, 'users', appData.currentUserId),
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
    if (!appData.currentUserId) {
      setStaffProfileError('Please sign in to save your profile.');
      return;
    }

    const role: StaffRole = appData.isAdmin ? 'admin' : 'agent';
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

      await setDoc(doc(db, 'users', appData.currentUserId), payload, { merge: true });

      if (role === 'agent') {
        const normalizedEmail = (staffProfileDraft.email || appData.currentUserEmail || '')
          .trim()
          .toLowerCase();
        if (!normalizedEmail) {
          throw new Error('Agent email is required');
        }

        const existingAgentProfile = appData.deliveryAgents.find(agent =>
          agent.id === normalizedEmail || agent.email?.toLowerCase() === normalizedEmail,
        );
        const agentStatusValue =
          staffProfileDraft.status === 'Offline' ? 'offline' : 'available';
        const agentPayload: Record<string, unknown> = {
          name: staffProfileDraft.name.trim(),
          phone: formatPhoneWithPrefix(staffProfileDraft.phone),
          email: normalizedEmail,
          vehicleType: staffProfileDraft.vehicleType,
          status: agentStatusValue,
          isActive: agentStatusValue !== 'offline',
          role: 'delivery',
          accessOnly: false,
          updatedAt: serverTimestamp(),
        };

        if (!existingAgentProfile) {
          agentPayload.createdAt = serverTimestamp();
        }
        await setDoc(doc(db, 'delivery_agents', normalizedEmail), agentPayload, {
          merge: true,
        });
      }

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
    if (!appData.isMainAdmin) {
      setAdminAccessError('Only the main admin can add new admins.');
      return;
    }

    const normalizedEmail = normalizeAccessEmail(adminAccessInput);
    const validationError = validateAccessEmail(normalizedEmail);
    if (validationError) {
      setAdminAccessError(validationError);
      return;
    }

    if (appData.adminAccessEntries.some(entry => entry.email === normalizedEmail)) {
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
    if (!appData.isMainAdmin) {
      setAdminAccessError('Only the main admin can remove admins.');
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
    if (!appData.isMainAdmin) {
      setDeliveryAccessError('Only the main admin can add delivery agents.');
      return;
    }

    const normalizedEmail = normalizeAccessEmail(deliveryAccessInput);
    const validationError = validateAccessEmail(normalizedEmail);
    if (validationError) {
      setDeliveryAccessError(validationError);
      return;
    }

    if (appData.deliveryAccessEntries.some(entry => entry.email === normalizedEmail)) {
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
    if (!appData.isMainAdmin) {
      setDeliveryAccessError('Only the main admin can remove delivery agents.');
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

  if (!appData.isAuthReady) {
    return <AuthLoadingPage />;
  }

  if (!appData.isLoggedIn) {
    return <LoginPage onLogin={loginWithGoogle} />;
  }

  if (appData.isAdmin) {
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
            <button onClick={handleOpenStaffProfile} className="coffee-icon-btn" aria-label="Profile">
              <User size={18} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-screen-md">
          <AdminDashboard
            orders={appData.adminOrders}
            offers={offers as Offer[]}
            isOffersLoading={isOffersLoading}
            offersError={offersError}
            newOrderDocIds={appData.newOrderDocIds}
            orderStatuses={ORDER_STATUSES}
            deliveryAgents={appData.deliveryAgents}
            onUpdateStatus={(orderDocId, status) => {
              void orderOperations.updateOrderStatus(orderDocId, status);
            }}
            onCreateOffer={createOffer}
            onUpdateOffer={updateOffer}
            onDeleteOffer={deleteOffer}
            onToggleOfferStatus={toggleOfferStatus}
          />
        </main>

        <StaffProfileDrawer
          isOpen={isStaffProfileOpen}
          isAdmin={appData.isAdmin}
          isDeliveryAgent={appData.isDeliveryAgent}
          isMainAdmin={appData.isMainAdmin}
          staffProfileDraft={staffProfileDraft}
          staffProfileError={staffProfileError}
          isStaffProfileSaving={isStaffProfileSaving}
          isStaffProfileSavedToastVisible={isStaffProfileSavedToastVisible}
          adminAccessEntries={appData.adminAccessEntries}
          deliveryAccessEntries={appData.deliveryAccessEntries}
          adminAccessInput={adminAccessInput}
          deliveryAccessInput={deliveryAccessInput}
          adminAccessError={adminAccessError}
          deliveryAccessError={deliveryAccessError}
          adminAccessSuccess={adminAccessSuccess}
          deliveryAccessSuccess={deliveryAccessSuccess}
          isAdminAccessSaving={isAdminAccessSaving}
          isDeliveryAccessSaving={isDeliveryAccessSaving}
          adminAccessRemovingId={adminAccessRemovingId}
          deliveryAccessRemovingId={deliveryAccessRemovingId}
          onClose={() => setIsStaffProfileOpen(false)}
          onLogout={() => {
            setIsStaffProfileOpen(false);
            void orderOperations.handleLogout();
          }}
          onSave={() => void handleSaveStaffProfile()}
          onStaffProfileDraftChange={setStaffProfileDraft}
          onAdminAccessInputChange={value => {
            setAdminAccessInput(value);
            if (adminAccessError) setAdminAccessError('');
            if (adminAccessSuccess) setAdminAccessSuccess('');
          }}
          onDeliveryAccessInputChange={value => {
            setDeliveryAccessInput(value);
            if (deliveryAccessError) setDeliveryAccessError('');
            if (deliveryAccessSuccess) setDeliveryAccessSuccess('');
          }}
          onAddAdminAccess={() => void handleAddAdminAccess()}
          onRemoveAdminAccess={entry => void handleRemoveAdminAccess(entry)}
          onAddDeliveryAccess={() => void handleAddDeliveryAccess()}
          onRemoveDeliveryAccess={entry => void handleRemoveDeliveryAccess(entry)}
        />
      </div>
    );
  }

  if (appData.isDeliveryAgent) {
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
            <button onClick={handleOpenStaffProfile} className="coffee-icon-btn" aria-label="Profile">
              <User size={18} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-screen-md">
          <AgentDashboard
            activeOrder={appData.currentDeliveryOrder}
            deliveryAgent={appData.currentDeliveryAgent}
            deliverySession={appData.currentDeliverySession}
            isAuthorized={appData.isDeliveryAgent}
            isTracking={appData.isAgentTracking}
            lastTrackedLocation={appData.agentLastTrackedLocation}
            orders={appData.adminOrders}
            onEndDelivery={orderDocId => {
              void orderOperations.handleEndDelivery(orderDocId);
            }}
            onStartDelivery={() => {
              void orderOperations.handleStartDelivery();
            }}
            permissionState={appData.agentPermissionState}
            trackerStatus={appData.agentTrackerStatus}
          />
        </main>

        <StaffProfileDrawer
          isOpen={isStaffProfileOpen}
          isAdmin={appData.isAdmin}
          isDeliveryAgent={appData.isDeliveryAgent}
          isMainAdmin={appData.isMainAdmin}
          staffProfileDraft={staffProfileDraft}
          staffProfileError={staffProfileError}
          isStaffProfileSaving={isStaffProfileSaving}
          isStaffProfileSavedToastVisible={isStaffProfileSavedToastVisible}
          adminAccessEntries={appData.adminAccessEntries}
          deliveryAccessEntries={appData.deliveryAccessEntries}
          adminAccessInput={adminAccessInput}
          deliveryAccessInput={deliveryAccessInput}
          adminAccessError={adminAccessError}
          deliveryAccessError={deliveryAccessError}
          adminAccessSuccess={adminAccessSuccess}
          deliveryAccessSuccess={deliveryAccessSuccess}
          isAdminAccessSaving={isAdminAccessSaving}
          isDeliveryAccessSaving={isDeliveryAccessSaving}
          adminAccessRemovingId={adminAccessRemovingId}
          deliveryAccessRemovingId={deliveryAccessRemovingId}
          onClose={() => setIsStaffProfileOpen(false)}
          onLogout={() => {
            setIsStaffProfileOpen(false);
            void orderOperations.handleLogout();
          }}
          onSave={() => void handleSaveStaffProfile()}
          onStaffProfileDraftChange={setStaffProfileDraft}
          onAdminAccessInputChange={setAdminAccessInput}
          onDeliveryAccessInputChange={setDeliveryAccessInput}
          onAddAdminAccess={() => void handleAddAdminAccess()}
          onRemoveAdminAccess={entry => void handleRemoveAdminAccess(entry)}
          onAddDeliveryAccess={() => void handleAddDeliveryAccess()}
          onRemoveDeliveryAccess={entry => void handleRemoveDeliveryAccess(entry)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/6 bg-[#120d0b]/78 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3">
          <button onClick={() => setActiveTab('home')} className="flex items-center gap-3 text-left">
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
              {appData.currentUserEmail}
            </div>
            <button onClick={handleOpenProfile} className="coffee-icon-btn" aria-label="Profile">
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-md">
        {activeTab === 'home' && (
          <HomePage
            menu={appData.menu as MenuItem[]}
            activeOffers={activeOffers}
            isMenuLoading={appData.isMenuLoading}
            cartQuantityById={checkout.cartQuantityById}
            onAddToCart={checkout.handleAddToCart}
            onOpenMenu={() => setActiveTab('menu')}
            onOpenOffers={() => setActiveTab('offers')}
          />
        )}
        {activeTab === 'menu' && (
          <MenuPage
            categories={categories}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            isMenuLoading={appData.isMenuLoading}
            filteredMenu={filteredMenu}
            cartQuantityById={checkout.cartQuantityById}
            onCategoryChange={setSelectedCategory}
            onSearchChange={setSearchQuery}
            onAddToCart={checkout.handleAddToCart}
          />
        )}
        {activeTab === 'offers' && (
          <OffersPage
            activeOffers={activeOffers}
            isLoading={isOffersLoading}
            error={offersError}
          />
        )}
        {activeTab === 'orders' && (
          <MyOrders
            orders={appData.userOrders}
            isLoading={appData.isUserOrdersLoading}
            onBrowseMenu={() => setActiveTab('menu')}
            onTrackOrder={handleTrackFromOrder}
          />
        )}
        {activeTab === 'tracking' && (
          <TrackingExperiencePage
            orderStatus={orderStatus}
            trackingOrderId={trackingOrderId}
            trackingError={trackingError}
            isTrackingOrder={isTrackingOrder}
            onTrackingOrderIdChange={setTrackingOrderId}
            onTrackOrder={handleTrackOrderLookup}
            onGoToMenu={() => setActiveTab('menu')}
            onBackToOrders={() => setActiveTab('orders')}
            onClearTracking={() => {
              setOrderStatus(null);
              setTrackingError('');
            }}
          />
        )}
        {activeTab === 'about' && <AboutPage />}
        {activeTab === 'contact' && <ContactPage />}
      </main>
      {activeTab === 'home' && (
        <footer className="mt-12 border-t border-white/5 px-6 pb-32 pt-12">
          <div className="mb-12 grid grid-cols-2 gap-8">
            <div>
              <h4 className="mb-4 font-black">Quick Links</h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li onClick={() => setActiveTab('about')} className="cursor-pointer hover:text-primary">About Us</li>
                <li onClick={() => setActiveTab('contact')} className="cursor-pointer hover:text-primary">Contact</li>
                <li onClick={() => setActiveTab('menu')} className="cursor-pointer hover:text-primary">Menu</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-black">Legal</h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li className="hover:text-primary">Privacy Policy</li>
                <li className="hover:text-primary">Terms of Service</li>
              </ul>
            </div>
          </div>
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            &copy; 2024 COFFEE HUB. All rights reserved.
          </p>
        </footer>
      )}

      {checkout.cartCount > 0 && activeTab !== 'tracking' && (
        <button
          onClick={() => checkout.setIsCartOpen(true)}
          className="fixed bottom-24 left-4 right-4 z-40 mx-auto flex max-w-screen-md items-center justify-between rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(111,78,55,0.96),rgba(62,39,35,0.96))] px-4 py-3 text-white shadow-[0_22px_40px_rgba(40,22,16,0.45)] active:scale-[0.98] sm:left-6 sm:right-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              {checkout.cartCount} item{checkout.cartCount === 1 ? '' : 's'}
            </div>
            <div className="text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Cart ready</p>
              <p className="text-sm font-semibold text-accent">View bag</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <span>{CURRENCY_SYMBOL}{checkout.payableCartTotal}</span>
            <ChevronRight size={18} />
          </div>
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#0f0b09]/92 px-4 py-3 backdrop-blur-2xl sm:px-6">
        <div className="mx-auto grid max-w-screen-md grid-cols-4 gap-2 rounded-[24px] border border-white/8 bg-[#120d0b]/88 p-2 shadow-[0_-10px_36px_rgba(0,0,0,0.16)]">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'menu', icon: MenuIcon, label: 'Menu' },
            { id: 'offers', icon: Tag, label: 'Offers' },
            { id: 'orders', icon: Clock, label: 'Orders' },
          ].map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as CustomerTab)}
                className={`coffee-nav-pill ${isActive ? 'coffee-nav-pill-active' : 'hover:bg-white/5 hover:text-accent'}`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <CustomerProfileDrawer
        isOpen={isProfileOpen}
        profileDraft={profileDraft}
        profileError={profileError}
        isProfileSaving={isProfileSaving}
        isProfileSavedToastVisible={isProfileSavedToastVisible}
        isProfileAddressExpanded={isProfileAddressExpanded}
        onClose={() => {
          setIsProfileOpen(false);
          setProfileError('');
          setIsProfileSavedToastVisible(false);
        }}
        onLogout={() => {
          setIsProfileOpen(false);
          void orderOperations.handleLogout();
        }}
        onSave={() => void handleSaveProfile()}
        onProfileDraftChange={setProfileDraft}
        onProfileAddressExpandedChange={setIsProfileAddressExpanded}
      />

      <CartDrawer
        isOpen={checkout.isCartOpen}
        cart={checkout.cart}
        cartCount={checkout.cartCount}
        cartTotal={checkout.cartTotal}
        hasCartItems={checkout.hasCartItems}
        discountAmount={checkout.discountAmount}
        deliveryFee={checkout.deliveryFee}
        payableCartTotal={checkout.payableCartTotal}
        checkoutStep={checkout.checkoutStep}
        setCheckoutStep={checkout.setCheckoutStep}
        customerDetails={checkout.customerDetails}
        setCustomerDetails={checkout.setCustomerDetails}
        selectedAddressIndex={checkout.selectedAddressIndex}
        setSelectedAddressIndex={checkout.setSelectedAddressIndex}
        savedAddressOptions={checkout.savedAddressOptions}
        selectedAddressLabel={checkout.selectedAddressLabel}
        checkoutAddressSummary={checkout.checkoutAddressSummary}
        isCheckoutAddressListOpen={checkout.isCheckoutAddressListOpen}
        setIsCheckoutAddressListOpen={checkout.setIsCheckoutAddressListOpen}
        checkoutError={checkout.checkoutError}
        setCheckoutError={checkout.setCheckoutError}
        isLocatingCustomer={checkout.isLocatingCustomer}
        customerLocationError={checkout.customerLocationError}
        isPlacingOrder={checkout.isPlacingOrder}
        couponInput={checkout.couponInput}
        setCouponInput={checkout.setCouponInput}
        appliedCouponCode={checkout.appliedCouponCode}
        couponError={checkout.couponError}
        couponSuccess={checkout.couponSuccess}
        isApplyingCoupon={checkout.isApplyingCoupon}
        isCouponAppliedPulseVisible={checkout.isCouponAppliedPulseVisible}
        checkoutPrimaryActionLabel={checkout.checkoutPrimaryActionLabel}
        orderStatus={orderStatus}
        hasCheckoutAddressSelectionRef={checkout.hasCheckoutAddressSelectionRef}
        onClose={() => checkout.setIsCartOpen(false)}
        onBrowseMenu={checkout.handleBrowseMenu}
        onQuantityChange={checkout.handleAddToCart}
        onRemoveItem={checkout.handleRemoveFromCart}
        onApplyCoupon={() => void checkout.handleApplyCoupon()}
        onRemoveCoupon={checkout.handleRemoveCoupon}
        onCaptureLocation={() => void checkout.handleCaptureCustomerLocation()}
        onPlaceOrder={() => void checkout.handlePlaceOrder()}
        onTrackOrder={() => {
          checkout.setIsCartOpen(false);
          checkout.setCheckoutStep('cart');
          setActiveTab('tracking');
          checkout.setDraftOrderId('');
        }}
      />

      <BrewingOverlay visible={checkout.isPlacingOrder && checkout.checkoutStep !== 'success'} />
    </div>
  );
}
