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
import { loginWithGoogle } from './auth';
import type { MenuItem, Offer, Order } from './types';
import { useOffers } from './hooks/useOffers';
import AdminDashboard from './components/AdminDashboard';
import AgentDashboard from './components/AgentDashboard';
import MyOrders from './components/MyOrders';
import { CURRENCY_SYMBOL, ORDER_STATUSES } from './features/app/lib/constants';
import { useRealtimeAppData } from './features/app/hooks/useRealtimeAppData';
import { useOrderOperations } from './features/app/hooks/useOrderOperations';
import { useProfileManager } from './features/app/hooks/useProfileManager';
import { useAccessManager } from './features/app/hooks/useAccessManager';
import { useShopTimingManager } from './features/app/hooks/useShopTimingManager';
import type { CustomerTab } from './features/app/types';
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
import { InstallAppBanner } from './features/customer/components/InstallAppBanner';
import { ShopStatusBanner } from './features/customer/components/ShopStatusBanner';
import { useInstallPrompt } from './features/customer/hooks/useInstallPrompt';
import { StaffProfileDrawer } from './features/staff/components/StaffProfileDrawer';
import { buildShopAvailabilityMessage } from '../shared/shopTiming';

export default function App() {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');
  const [orderStatus, setOrderStatus] = useState<Order | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [isTrackingOrder, setIsTrackingOrder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const installPrompt = useInstallPrompt();

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
    profileSaved: appData.profileSaved,
    shopTiming: appData.shopTiming,
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

  const profileManager = useProfileManager({
    currentUserId: appData.currentUserId,
    currentUserEmail: appData.currentUserEmail,
    isAdmin: appData.isAdmin,
    isDeliveryAgent: appData.isDeliveryAgent,
    profileSaved: appData.profileSaved,
    staffProfileSaved: appData.staffProfileSaved,
    deliveryAgents: appData.deliveryAgents,
  });

  const accessManager = useAccessManager({
    isMainAdmin: appData.isMainAdmin,
    adminAccessEntries: appData.adminAccessEntries,
    deliveryAccessEntries: appData.deliveryAccessEntries,
  });

  const shopTimingManager = useShopTimingManager({
    isAdmin: appData.isAdmin,
    isDrawerOpen: profileManager.isStaffProfileOpen,
    shopTiming: appData.shopTiming,
  });

  // Reset customer-facing state on logout
  useEffect(() => {
    if (!appData.isLoggedIn) {
      setActiveTab('home');
      setOrderStatus(null);
      setTrackingOrderId('');
      setTrackingError('');
    }
  }, [appData.isLoggedIn]);

  // Keep displayed order status in sync with live Firestore data
  useEffect(() => {
    if (!orderStatus) return;
    const syncedOrder = appData.userOrders.find(o => o.id === orderStatus.id);
    if (!syncedOrder) return;

    setOrderStatus(prev => {
      if (!prev || prev.id !== syncedOrder.id) return prev;
      const mergedItems =
        syncedOrder.items && syncedOrder.items.length > 0 ? syncedOrder.items : prev.items;
      const isSameStatus = prev.status === syncedOrder.status;
      const isSameTotal = prev.total_amount === syncedOrder.total_amount;
      const isSameAddress = prev.address === syncedOrder.address;
      const isSameLocation =
        prev.customer_location?.lat === syncedOrder.customer_location?.lat &&
        prev.customer_location?.lng === syncedOrder.customer_location?.lng;
      const isSameItemsRef = prev.items === mergedItems;
      if (isSameStatus && isSameTotal && isSameAddress && isSameLocation && isSameItemsRef) {
        return prev;
      }
      return { ...syncedOrder, items: mergedItems };
    });
  }, [appData.userOrders, orderStatus]);

  // Navigate to tracking after successful checkout
  useEffect(() => {
    if (checkout.checkoutStep !== 'success' || !orderStatus) return;
    const id = window.setTimeout(() => {
      checkout.setIsCartOpen(false);
      checkout.setCheckoutStep('cart');
      setActiveTab('tracking');
      checkout.setDraftOrderId('');
    }, 1800);
    return () => window.clearTimeout(id);
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
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [appData.menu, searchQuery, selectedCategory],
  );
  const shopAvailabilityMessage = useMemo(
    () => buildShopAvailabilityMessage(appData.shopTiming.openTime),
    [appData.shopTiming.openTime],
  );
  const shouldShowShopClosedBanner = !appData.isShopTimingLoading && !checkout.isShopOpen;
  const isCartFloatingVisible = checkout.cartCount > 0 && activeTab !== 'tracking';

  const handleTrackOrderLookup = () => {
    const orderId = trackingOrderId.trim().toUpperCase();
    if (!orderId) {
      setTrackingError('Enter your order ID to track it.');
      return;
    }
    setTrackingError('');
    setIsTrackingOrder(true);
    const matchedOrder = appData.userOrders.find(o => o.id === orderId);
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

  // --- Shared StaffProfileDrawer props ---
  const staffDrawerProps = {
    isOpen: profileManager.isStaffProfileOpen,
    isAdmin: appData.isAdmin,
    isDeliveryAgent: appData.isDeliveryAgent,
    isMainAdmin: appData.isMainAdmin,
    staffProfileDraft: profileManager.staffProfileDraft,
    staffProfileError: profileManager.staffProfileError,
    isStaffProfileSaving: profileManager.isStaffProfileSaving,
    isStaffProfileSavedToastVisible: profileManager.isStaffProfileSavedToastVisible,
    shopTiming: appData.shopTiming,
    shopTimingDraft: shopTimingManager.shopTimingDraft,
    shopTimingError: shopTimingManager.shopTimingError,
    shopTimingSuccess: shopTimingManager.shopTimingSuccess,
    isShopTimingSaving: shopTimingManager.isShopTimingSaving,
    adminAccessEntries: appData.adminAccessEntries,
    deliveryAccessEntries: appData.deliveryAccessEntries,
    adminAccessInput: accessManager.adminAccessInput,
    deliveryAccessInput: accessManager.deliveryAccessInput,
    adminAccessError: accessManager.adminAccessError,
    deliveryAccessError: accessManager.deliveryAccessError,
    adminAccessSuccess: accessManager.adminAccessSuccess,
    deliveryAccessSuccess: accessManager.deliveryAccessSuccess,
    isAdminAccessSaving: accessManager.isAdminAccessSaving,
    isDeliveryAccessSaving: accessManager.isDeliveryAccessSaving,
    adminAccessRemovingId: accessManager.adminAccessRemovingId,
    deliveryAccessRemovingId: accessManager.deliveryAccessRemovingId,
    onClose: () => profileManager.setIsStaffProfileOpen(false),
    onLogout: () => {
      profileManager.setIsStaffProfileOpen(false);
      void orderOperations.handleLogout();
    },
    onSave: () => void profileManager.handleSaveStaffProfile(),
    onStaffProfileDraftChange: profileManager.setStaffProfileDraft,
    onShopTimingDraftChange: shopTimingManager.handleShopTimingDraftChange,
    onSaveShopTiming: () => void shopTimingManager.handleSaveShopTiming(),
    onAdminAccessInputChange: (value: string) => {
      accessManager.setAdminAccessInput(value);
      if (accessManager.adminAccessError) accessManager.setAdminAccessError('');
      if (accessManager.adminAccessSuccess) accessManager.setAdminAccessSuccess('');
    },
    onDeliveryAccessInputChange: (value: string) => {
      accessManager.setDeliveryAccessInput(value);
      if (accessManager.deliveryAccessError) accessManager.setDeliveryAccessError('');
      if (accessManager.deliveryAccessSuccess) accessManager.setDeliveryAccessSuccess('');
    },
    onAddAdminAccess: () => void accessManager.handleAddAdminAccess(),
    onRemoveAdminAccess: accessManager.handleRemoveAdminAccess,
    onAddDeliveryAccess: () => void accessManager.handleAddDeliveryAccess(),
    onRemoveDeliveryAccess: accessManager.handleRemoveDeliveryAccess,
  };

  // --- Early returns for loading / auth / role views ---

  if (!appData.isAuthReady) return <AuthLoadingPage />;
  if (!appData.isLoggedIn) return <LoginPage onLogin={loginWithGoogle} />;

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
            <button onClick={profileManager.handleOpenStaffProfile} className="coffee-icon-btn" aria-label="Profile">
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

        <StaffProfileDrawer {...staffDrawerProps} />
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
            <button onClick={profileManager.handleOpenStaffProfile} className="coffee-icon-btn" aria-label="Profile">
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
            onEndDelivery={orderDocId => { void orderOperations.handleEndDelivery(orderDocId); }}
            onStartDelivery={() => { void orderOperations.handleStartDelivery(); }}
            permissionState={appData.agentPermissionState}
            trackerStatus={appData.agentTrackerStatus}
          />
        </main>

        <StaffProfileDrawer {...staffDrawerProps} />
      </div>
    );
  }

  // --- Customer view ---
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
            <button onClick={profileManager.handleOpenProfile} className="coffee-icon-btn" aria-label="Profile">
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-md">
        {shouldShowShopClosedBanner && (
          <div className="px-4 pt-20 sm:px-6">
            <ShopStatusBanner
              openTime={appData.shopTiming.openTime}
              closeTime={appData.shopTiming.closeTime}
            />
          </div>
        )}

        {activeTab === 'home' && (
          <HomePage
            menu={appData.menu as MenuItem[]}
            activeOffers={activeOffers}
            isMenuLoading={appData.isMenuLoading}
            cartQuantityById={checkout.cartQuantityById}
            hasStatusBanner={shouldShowShopClosedBanner}
            isShopOpen={checkout.isShopOpen}
            shopAvailabilityMessage={shopAvailabilityMessage}
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
            hasStatusBanner={shouldShowShopClosedBanner}
            isShopOpen={checkout.isShopOpen}
            shopAvailabilityMessage={shopAvailabilityMessage}
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

      <InstallAppBanner
        isVisible={installPrompt.isInstallPromptAvailable}
        isCartButtonVisible={isCartFloatingVisible}
        onDismiss={installPrompt.dismissPrompt}
        onInstall={() => void installPrompt.promptToInstall()}
      />

      {isCartFloatingVisible && (
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
        isOpen={profileManager.isProfileOpen}
        profileDraft={profileManager.profileDraft}
        profileError={profileManager.profileError}
        isProfileSaving={profileManager.isProfileSaving}
        isProfileSavedToastVisible={profileManager.isProfileSavedToastVisible}
        isProfileAddressExpanded={profileManager.isProfileAddressExpanded}
        onClose={() => {
          profileManager.setIsProfileOpen(false);
        }}
        onLogout={() => {
          profileManager.setIsProfileOpen(false);
          void orderOperations.handleLogout();
        }}
        onSave={() => void profileManager.handleSaveProfile()}
        onProfileDraftChange={profileManager.setProfileDraft}
        onProfileAddressExpandedChange={profileManager.setIsProfileAddressExpanded}
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
        isShopOpen={checkout.isShopOpen}
        shopTimingRangeLabel={checkout.shopTimingRangeLabel}
        shopStatusMessage={checkout.shopStatusMessage}
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
