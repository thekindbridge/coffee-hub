import { Suspense, useEffect, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Clock,
  Coffee,
  Home,
  Menu as MenuIcon,
  Tag,
} from 'lucide-react';
import { formatPhoneForDisplay } from '../../../shared/phone';
import { CURRENCY_SYMBOL } from '../../features/app/lib/constants';
import { HomeFooter } from '../../components/common/HomeFooter';
import { BottomNavigation } from '../../components/common/BottomNavigation';
import { RoleHeader } from '../../components/common/RoleHeader';
import { ForegroundNotificationToast } from '../../components/ForegroundNotificationToast';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { AppShellLayout } from '../../components/ui/AppShellLayout';
import { Loader } from '../../components/ui/Loader';
import { BrewingOverlay } from '../../features/customer/components/BrewingOverlay';
import { InstallAppBanner } from '../../features/customer/components/InstallAppBanner';
import { ShopStatusBanner } from '../../features/customer/components/ShopStatusBanner';
import { useNotificationHistory } from '../../features/app/hooks/useNotificationHistory';
import { useCustomerExperience } from '../../features/customer/hooks/useCustomerExperience';
import { MenuPageSkeleton } from '../../pages/Menu/components/MenuPageSkeleton';
import { OrdersPageSkeleton } from '../../pages/Orders/components/OrdersPageSkeleton';
import { TrackingPageSkeleton } from '../../pages/Tracking/components/TrackingPageSkeleton';
import { lazyNamed } from '../../utils/lazyNamed';
import type { CustomerShellProps } from './types';

const HomePage = lazyNamed(
  () => import('../../pages/Home/HomePage'),
  'HomePage',
);
const MenuPage = lazyNamed(
  () => import('../../pages/Menu/MenuPage'),
  'MenuPage',
);
const OffersPage = lazyNamed(
  () => import('../../pages/Offers/OffersPage'),
  'OffersPage',
);
const OrdersPage = lazyNamed(
  () => import('../../pages/Orders/OrdersPage'),
  'OrdersPage',
);
const TrackingPage = lazyNamed(
  () => import('../../pages/Tracking/TrackingPage'),
  'TrackingPage',
);
const AboutPage = lazyNamed(
  () => import('../../pages/About/AboutPage'),
  'AboutPage',
);
const ContactPage = lazyNamed(
  () => import('../../pages/Contact/ContactPage'),
  'ContactPage',
);
const CartDrawer = lazyNamed(
  () => import('../../features/customer/components/CartDrawer'),
  'CartDrawer',
);
const ProfileScreen = lazyNamed(
  () => import('../../features/profile/ProfileScreen'),
  'ProfileScreen',
);
const NotificationHistoryPage = lazyNamed(
  () => import('../../pages/Notifications/NotificationHistoryPage'),
  'NotificationHistoryPage',
);

export const CustomerAppShell = ({
  accessManager,
  installPrompt,
  offersState,
  orderOperations,
  orderStatus,
  profileManager,
  pushNotifications,
  session,
  setOrderStatus,
  shopTimingManager,
}: CustomerShellProps) => {
  const [hasLoadedCartDrawer, setHasLoadedCartDrawer] = useState(false);
  const [hasLoadedProfileDrawer, setHasLoadedProfileDrawer] = useState(false);
  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false);

  const customerExperience = useCustomerExperience({
    currentUserId: session.currentUserId,
    findActiveOfferByCode: offersState.findActiveOfferByCode,
    isShopTimingLoading: session.isShopTimingLoading,
    isUserOrdersLoading: session.isUserOrdersLoading,
    menu: session.menu,
    orderStatus,
    profileSaved: session.profileSaved,
    setOrderStatus,
    shopTiming: session.shopTiming,
    userOrders: session.userOrders,
  });
  const notificationHistory = useNotificationHistory({
    currentUserId: session.currentUserId,
    isAuthReady: session.isAuthReady,
    isLoggedIn: session.isLoggedIn,
    role: session.role,
  });

  useEffect(() => {
    if (customerExperience.checkout.isCartOpen) {
      setHasLoadedCartDrawer(true);
    }
  }, [customerExperience.checkout.isCartOpen]);

  useEffect(() => {
    if (profileManager.isProfileOpen) {
      setHasLoadedProfileDrawer(true);
    }
  }, [profileManager.isProfileOpen]);

  const page = (() => {
    switch (customerExperience.activeTab) {
      case 'home':
        return {
          content: (
            <HomePage
              activeOffers={offersState.activeOffers}
              cartQuantityById={customerExperience.checkout.cartQuantityById}
              hasStatusBanner={customerExperience.shouldShowShopClosedBanner}
              isMenuLoading={session.isMenuLoading}
              isShopOpen={customerExperience.checkout.isShopOpen}
              menu={session.menu}
              onAddToCart={customerExperience.checkout.handleAddToCart}
              onOpenMenu={() => customerExperience.setActiveTab('menu')}
              onOpenOffers={() => customerExperience.setActiveTab('offers')}
              shopAvailabilityMessage={customerExperience.shopAvailabilityMessage}
            />
          ),
          fallback: <Loader label="Loading home..." minHeightClassName="min-h-[420px]" />,
        };
      case 'menu':
        return {
          content: (
            <MenuPage
              cartQuantityById={customerExperience.checkout.cartQuantityById}
              categories={customerExperience.categories}
              filteredMenu={customerExperience.filteredMenu}
              hasStatusBanner={customerExperience.shouldShowShopClosedBanner}
              isMenuLoading={session.isMenuLoading}
              isShopOpen={customerExperience.checkout.isShopOpen}
              onAddToCart={customerExperience.checkout.handleAddToCart}
              onCategoryChange={customerExperience.setSelectedCategory}
              onSearchChange={customerExperience.setSearchQuery}
              searchQuery={customerExperience.searchQuery}
              selectedCategory={customerExperience.selectedCategory}
              shopAvailabilityMessage={customerExperience.shopAvailabilityMessage}
            />
          ),
          fallback: (
            <MenuPageSkeleton
              hasStatusBanner={customerExperience.shouldShowShopClosedBanner}
            />
          ),
        };
      case 'offers':
        return {
          content: (
            <OffersPage
              activeOffers={offersState.activeOffers}
              error={offersState.error}
              isLoading={offersState.isLoading}
            />
          ),
          fallback: <Loader label="Loading offers..." minHeightClassName="min-h-[320px]" />,
        };
      case 'orders':
        return {
          content: (
            <OrdersPage
              isLoading={session.isUserOrdersLoading}
              orders={session.userOrders}
              onBrowseMenu={() => customerExperience.setActiveTab('menu')}
              onCancelOrder={async (order, cancellationReason) => {
                await orderOperations.cancelOrder(order.doc_id, cancellationReason);
              }}
              onTrackOrder={customerExperience.handleTrackFromOrder}
            />
          ),
          fallback: <OrdersPageSkeleton />,
        };
      case 'tracking':
        return {
          content: (
            <TrackingPage
              isTrackingOrder={customerExperience.isTrackingOrder}
              onBackToOrders={() => customerExperience.setActiveTab('orders')}
              onClearTracking={customerExperience.clearTracking}
              onGoToMenu={() => customerExperience.setActiveTab('menu')}
              onTrackOrder={customerExperience.handleTrackOrderLookup}
              onTrackingOrderIdChange={customerExperience.setTrackingOrderId}
              orderStatus={orderStatus}
              trackingError={customerExperience.trackingError}
              trackingOrderId={customerExperience.trackingOrderId}
            />
          ),
          fallback: <TrackingPageSkeleton />,
        };
      case 'about':
        return {
          content: <AboutPage />,
          fallback: <Loader label="Loading details..." minHeightClassName="min-h-[320px]" />,
        };
      case 'contact':
        return {
          content: <ContactPage />,
          fallback: <Loader label="Loading contact page..." minHeightClassName="min-h-[320px]" />,
        };
      default:
        return {
          content: null,
          fallback: null,
        };
    }
  })();

  const drawerLoader = (
    <Loader
      className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm"
      fullScreen
      label="Loading panel..."
    />
  );

  return (
    <AppShellLayout
      footer={customerExperience.activeTab === 'home' ? (
        <HomeFooter onNavigate={customerExperience.setActiveTab} />
      ) : undefined}
      header={(
        <RoleHeader
          eyebrow="COFFEE-HUB"
          icon={Coffee}
          onBrandClick={() => customerExperience.setActiveTab('home')}
          onProfileClick={profileManager.handleOpenProfile}
          rightSlot={(
            <>
              <button
                type="button"
                onClick={() => setIsNotificationHistoryOpen(true)}
                className="coffee-icon-btn relative"
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {notificationHistory.unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                    {notificationHistory.unreadCount > 9 ? '9+' : notificationHistory.unreadCount}
                  </span>
                )}
              </button>
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-ink-muted sm:block">
                {formatPhoneForDisplay(session.currentUserPhone)}
              </div>
            </>
          )}
          title="Fresh food, brewed fast"
        />
      )}
      navigation={(
        <BottomNavigation
          activeId={customerExperience.activeTab}
          items={[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'menu', icon: MenuIcon, label: 'Menu' },
            { id: 'offers', icon: Tag, label: 'Offers' },
            { id: 'orders', icon: Clock, label: 'Orders' },
          ]}
          onChange={nextTab => customerExperience.setActiveTab(nextTab)}
        />
      )}
      overlays={(
        <>
          <InstallAppBanner
            isVisible={installPrompt.isInstallPromptAvailable}
            isCartButtonVisible={customerExperience.isCartFloatingVisible}
            onDismiss={installPrompt.dismissPrompt}
            onInstall={() => void installPrompt.promptToInstall()}
          />

          {customerExperience.isCartFloatingVisible && (
            <button
              onClick={() => customerExperience.checkout.setIsCartOpen(true)}
              className="fixed bottom-24 left-4 right-4 z-40 mx-auto flex max-w-screen-md items-center justify-between rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(111,78,55,0.96),rgba(62,39,35,0.96))] px-4 py-3 text-white shadow-[0_22px_40px_rgba(40,22,16,0.45)] active:scale-[0.98] sm:left-6 sm:right-6"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {customerExperience.checkout.cartCount} item{customerExperience.checkout.cartCount === 1 ? '' : 's'}
                </div>
                <div className="text-left">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Cart ready</p>
                  <p className="text-sm font-semibold text-accent">View bag</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[15px] font-semibold">
                <span>{CURRENCY_SYMBOL}{customerExperience.checkout.payableCartTotal}</span>
                <ChevronRight size={18} />
              </div>
            </button>
          )}

          {hasLoadedProfileDrawer && (
            <Suspense fallback={drawerLoader}>
              <ProfileScreen
                canAccessAdminPanel={session.canAccessAdminPanel}
                isDeliveryAgent={session.isDeliveryAgent}
                isOpen={profileManager.isProfileOpen}
                isOwner={session.isOwner}
                role={session.role}
                isProfileAddressExpanded={profileManager.isProfileAddressExpanded}
                isProfileSavedToastVisible={profileManager.isProfileSavedToastVisible}
                isProfileSaving={profileManager.isProfileSaving}
                isNotificationSyncing={pushNotifications.isSyncing}
                notificationPermissionState={pushNotifications.permissionState}
                notificationSyncError={pushNotifications.syncError}
                profileDraft={profileManager.profileDraft}
                profileError={profileManager.profileError}
                profileSyncError={session.profileSyncError}
                roleChangeError={accessManager.roleChangeError}
                roleChangeSuccess={accessManager.roleChangeSuccess}
                shopTiming={session.shopTiming}
                shopTimingDraft={shopTimingManager.shopTimingDraft}
                shopTimingError={shopTimingManager.shopTimingError}
                shopTimingSuccess={shopTimingManager.shopTimingSuccess}
                pendingRoleAction={accessManager.pendingRoleAction}
                pendingRolePhone={accessManager.pendingRolePhone}
                pendingRoleValue={accessManager.pendingRoleValue}
                userRoleEntries={session.userRoleEntries}
                isShopTimingSaving={shopTimingManager.isShopTimingSaving}
                onAssignUserRole={(phone, role) => {
                  if (accessManager.roleChangeError) {
                    accessManager.setRoleChangeError('');
                  }
                  if (accessManager.roleChangeSuccess) {
                    accessManager.setRoleChangeSuccess('');
                  }
                  void accessManager.handleAssignUserRole(phone, role);
                }}
                onRemoveUserRole={entry => {
                  if (accessManager.roleChangeError) {
                    accessManager.setRoleChangeError('');
                  }
                  if (accessManager.roleChangeSuccess) {
                    accessManager.setRoleChangeSuccess('');
                  }
                  void accessManager.handleRemoveUserRole(entry);
                }}
                onClose={() => {
                  profileManager.setIsProfileOpen(false);
                }}
                onEnablePushNotifications={() => {
                  void pushNotifications.requestPermission();
                }}
                onLogout={() => {
                  profileManager.setIsProfileOpen(false);
                  void orderOperations.handleLogout();
                }}
                onNotificationSettingsChange={settings => {
                  void profileManager.handleSaveProfileNotificationSettings(settings);
                }}
                onProfileAddressExpandedChange={profileManager.setIsProfileAddressExpanded}
                onProfileDraftChange={profileManager.setProfileDraft}
                onSave={() => void profileManager.handleSaveProfile()}
                onSaveShopTiming={() => void shopTimingManager.handleSaveShopTiming()}
                onShopTimingDraftChange={shopTimingManager.handleShopTimingDraftChange}
              />
            </Suspense>
          )}

          {hasLoadedCartDrawer && (
            <Suspense fallback={drawerLoader}>
              <CartDrawer
                appliedCouponCode={customerExperience.checkout.appliedCouponCode}
                cart={customerExperience.checkout.cart}
                cartCount={customerExperience.checkout.cartCount}
                cartTotal={customerExperience.checkout.cartTotal}
                checkoutAddressSummary={customerExperience.checkout.checkoutAddressSummary}
                checkoutError={customerExperience.checkout.checkoutError}
                checkoutPrimaryActionLabel={customerExperience.checkout.checkoutPrimaryActionLabel}
                checkoutStep={customerExperience.checkout.checkoutStep}
                couponError={customerExperience.checkout.couponError}
                couponInput={customerExperience.checkout.couponInput}
                couponSuccess={customerExperience.checkout.couponSuccess}
                customerDetails={customerExperience.checkout.customerDetails}
                customerLocationError={customerExperience.checkout.customerLocationError}
                deliveryFee={customerExperience.checkout.deliveryFee}
                discountAmount={customerExperience.checkout.discountAmount}
                hasCartItems={customerExperience.checkout.hasCartItems}
                hasCheckoutAddressSelectionRef={customerExperience.checkout.hasCheckoutAddressSelectionRef}
                isApplyingCoupon={customerExperience.checkout.isApplyingCoupon}
                isCheckoutAddressListOpen={customerExperience.checkout.isCheckoutAddressListOpen}
                isCouponAppliedPulseVisible={customerExperience.checkout.isCouponAppliedPulseVisible}
                isLocatingCustomer={customerExperience.checkout.isLocatingCustomer}
                isOpen={customerExperience.checkout.isCartOpen}
                isPlacingOrder={customerExperience.checkout.isPlacingOrder}
                isShopOpen={customerExperience.checkout.isShopOpen}
                onApplyCoupon={() => void customerExperience.checkout.handleApplyCoupon()}
                onBrowseMenu={customerExperience.checkout.handleBrowseMenu}
                onCaptureLocation={() => void customerExperience.checkout.handleCaptureCustomerLocation()}
                onClose={() => customerExperience.checkout.setIsCartOpen(false)}
                onPlaceOrder={() => void customerExperience.checkout.handlePlaceOrder()}
                onQuantityChange={customerExperience.checkout.handleAddToCart}
                onRemoveCoupon={customerExperience.checkout.handleRemoveCoupon}
                onRemoveItem={customerExperience.checkout.handleRemoveFromCart}
                onTrackOrder={() => {
                  customerExperience.checkout.setIsCartOpen(false);
                  customerExperience.checkout.setCheckoutStep('cart');
                  customerExperience.setActiveTab('tracking');
                  customerExperience.checkout.setDraftOrderId('');
                }}
                orderStatus={orderStatus}
                payableCartTotal={customerExperience.checkout.payableCartTotal}
                savedAddressOptions={customerExperience.checkout.savedAddressOptions}
                selectedAddressIndex={customerExperience.checkout.selectedAddressIndex}
                selectedAddressLabel={customerExperience.checkout.selectedAddressLabel}
                setCheckoutError={customerExperience.checkout.setCheckoutError}
                setCheckoutStep={customerExperience.checkout.setCheckoutStep}
                setCouponInput={customerExperience.checkout.setCouponInput}
                setCustomerDetails={customerExperience.checkout.setCustomerDetails}
                setIsCheckoutAddressListOpen={customerExperience.checkout.setIsCheckoutAddressListOpen}
                setSelectedAddressIndex={customerExperience.checkout.setSelectedAddressIndex}
                shopStatusMessage={customerExperience.checkout.shopStatusMessage}
                shopTimingRangeLabel={customerExperience.checkout.shopTimingRangeLabel}
              />
            </Suspense>
          )}

          <BrewingOverlay visible={customerExperience.checkout.isPlacingOrder && customerExperience.checkout.checkoutStep !== 'success'} />
          <ForegroundNotificationToast
            notification={pushNotifications.foregroundNotification}
            onDismiss={pushNotifications.dismissForegroundNotification}
          />
          <Suspense fallback={drawerLoader}>
            <NotificationHistoryPage
              error={notificationHistory.error}
              isLoading={notificationHistory.isLoading}
              isMarkingId={notificationHistory.isMarkingId}
              isOpen={isNotificationHistoryOpen}
              notifications={notificationHistory.notifications}
              onClose={() => setIsNotificationHistoryOpen(false)}
              onMarkAsRead={notificationId => {
                void notificationHistory.markAsRead(notificationId);
              }}
            />
          </Suspense>
        </>
      )}
    >
      {pushNotifications.isPermissionBannerVisible && (
        <div className="px-4 pt-20 sm:px-6">
          <NotificationPermissionBanner
            isSyncing={pushNotifications.isSyncing}
            onDismiss={pushNotifications.dismissPermissionBanner}
            onEnable={() => {
              void pushNotifications.requestPermission();
            }}
          />
        </div>
      )}

      {customerExperience.shouldShowShopClosedBanner && (
        <div className="px-4 pt-20 sm:px-6">
          <ShopStatusBanner
            closeTime={session.shopTiming.closeTime}
            openTime={session.shopTiming.openTime}
          />
        </div>
      )}

      {page.content && (
        <Suspense fallback={page.fallback}>
          {page.content}
        </Suspense>
      )}
    </AppShellLayout>
  );
};
