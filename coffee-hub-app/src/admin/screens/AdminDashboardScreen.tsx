import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/customer/AppHeader';
import { StatusBadge } from '../../components/customer/StatusBadge';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { ADMIN_ROUTES } from '../../constants/routes';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import { useAdminMenuManager, useAccessRoles, subscribeToAdminOrders } from '../hooks';
import { useAuth } from '../../hooks/useAuth';
import { useMenu } from '../../hooks/useMenu';
import { useShopTiming } from '../../hooks/useShopTiming';
import type { AdminStackParamList } from '../../navigation/types';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  adminPalette,
  adminRadius,
  adminShadow,
  getAdminStatusTone,
  getAdminSurfaceColor,
} from '../utils/designSystem';
import { AdminStatCard } from '../components';
import type { Order } from '../types';

type AdminNavigation = BottomTabNavigationProp<AdminStackParamList>;

const getFirstMeaningfulItem = (order: Order) => (
  order.items?.[0]?.name || 'Order items syncing'
);

const getInitials = (value: string) => {
  const words = value
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  return words.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'CH';
};

const formatOrderTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown time';
  }

  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
};

export function AdminDashboardScreen() {
  const navigation = useNavigation<AdminNavigation>();
  const { currentUserEmail, normalizedCurrentEmail, user } = useAuth();
  const { profileDisplayName, authPhotoUrl, primaryAddress } = useProfileData();
  const { adminAccessEntries, deliveryAccessEntries, isMainAdmin } = useAccessRoles(
    currentUserEmail,
    normalizedCurrentEmail,
  );
  const { menu } = useMenu();
  const { menuItems } = useAdminMenuManager();
  const { isOpen, shopTiming } = useShopTiming();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToAdminOrders(
      nextOrders => {
        setOrders(nextOrders);
        setOrdersError('');
      },
      error => {
        console.error('Failed to load admin dashboard orders', error);
        setOrdersError(error.message || 'Unable to sync dashboard orders right now.');
      },
    );

    return unsubscribe;
  }, []);

  const totalOrders = orders.length;
  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + (order.final_total ?? order.total_amount ?? 0), 0),
    [orders],
  );
  const deliveredRevenue = useMemo(
    () => orders
      .filter(order => order.status_code === 'DELIVERED')
      .reduce((sum, order) => sum + (order.final_total ?? order.total_amount ?? 0), 0),
    [orders],
  );
  const currentlyBrewing = useMemo(
    () => orders.filter(order => (
      order.status_code === 'ACCEPTED' || order.status_code === 'PREPARING'
    )).length,
    [orders],
  );
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const unavailableItems = useMemo(
    () => menuItems.filter(item => !item.is_available),
    [menuItems],
  );
  const roleSummary = `${adminAccessEntries.length} admins · ${deliveryAccessEntries.length} agents`;
  const dashboardName = profileDisplayName || user?.displayName || 'COFFEE-HUB';
  const dashboardInitials = getInitials(dashboardName);
  const revenueProgress = totalRevenue > 0 ? deliveredRevenue / totalRevenue : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenTransition style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View pointerEvents="none" style={styles.decorLayer}>
            <LinearGradient
              colors={['rgba(200, 146, 99, 0.24)', 'rgba(200, 146, 99, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.decorGlowTop}
            />
            <LinearGradient
              colors={['rgba(231, 185, 172, 0.18)', 'rgba(231, 185, 172, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.decorGlowBottom}
            />
          </View>

          <AppHeader
            mode="admin"
            avatarUrl={authPhotoUrl}
            initials={dashboardInitials}
            title="COFFEE-HUB"
            subtitle={isMainAdmin ? 'Main roastery console' : 'Roastery console'}
            onAvatarPress={() => navigation.navigate(ADMIN_ROUTES.PROFILE)}
          />

          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Roastery Dashboard</Text>
            <Text style={styles.title}>Command the floor with calm, live clarity.</Text>
            <Text style={styles.subtitle}>
              Orders, menu availability, delivery windows, and promo activity stay visible in one warm control surface.
            </Text>

            <View style={styles.heroMetaRow}>
              <StatusBadge label={isOpen ? 'Shop Open' : 'Shop Paused'} tone={isOpen ? 'success' : 'danger'} />
              <StatusBadge label={roleSummary} tone="member" />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <PrimaryButton
              title="Pause Shop"
              onPress={() => navigation.navigate(ADMIN_ROUTES.PROFILE)}
              style={styles.actionButton}
            />
            <PrimaryButton
              title="New Manual Order"
              variant="secondary"
              onPress={() => {
                Alert.alert(
                  'Manual order',
                  'Manual order entry is not wired in the current mobile codebase yet.',
                );
              }}
              style={styles.actionButton}
            />
          </View>

          {ordersError ? (
            <View style={styles.errorWrap}>
              <GlassSurface
                depth="card"
                intensity={66}
                overlayColor="rgba(225, 161, 141, 0.14)"
                style={styles.errorCard}
              >
                <Text style={styles.errorText}>{ordersError}</Text>
              </GlassSurface>
            </View>
          ) : null}

          <View style={styles.statsGrid}>
            <AdminStatCard
              label="Total Orders"
              value={totalOrders}
              icon="receipt-outline"
              detail={formatCurrency(totalRevenue)}
              tone="caramel"
              style={styles.halfStat}
            />
            <AdminStatCard
              label="Currently Brewing"
              value={currentlyBrewing}
              icon="cafe-outline"
              detail={`${menu.length} live items`}
              tone="success"
              style={styles.halfStat}
            />
            <AdminStatCard
              label="Revenue"
              value={formatCurrency(totalRevenue)}
              icon="cash-outline"
              detail={`${formatCurrency(deliveredRevenue)} delivered`}
              progress={revenueProgress}
              tone="warning"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <Text style={styles.sectionMeta}>{totalOrders} synced</Text>
            </View>

            <View style={styles.shadowWrap}>
              <GlassSurface
                depth="section"
                intensity={68}
                overlayColor={getAdminSurfaceColor('section')}
                style={styles.sectionCard}
              >
                {recentOrders.length ? recentOrders.map(order => (
                  <View key={order.doc_id} style={styles.orderRow}>
                    <View style={styles.orderCopy}>
                      <Text style={styles.orderCustomer}>
                        {order.customer_name || 'Walk-in Customer'}
                      </Text>
                      <Text numberOfLines={1} style={styles.orderItem}>
                        {getFirstMeaningfulItem(order)}
                      </Text>
                    </View>

                    <View style={styles.orderMetaBlock}>
                      <Text style={styles.orderPrice}>{formatCurrency(order.total_amount)}</Text>
                      <StatusBadge
                        label={order.status}
                        tone={getAdminStatusTone(order.status_code)}
                      />
                      <Text style={styles.orderTime}>{formatOrderTime(order.created_at)}</Text>
                    </View>
                  </View>
                )) : (
                  <Text style={styles.emptyText}>
                    New orders will appear here as soon as Firestore syncs them.
                  </Text>
                )}
              </GlassSurface>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Stock Alerts</Text>
              <Text style={styles.sectionMeta}>
                {unavailableItems.length ? `${unavailableItems.length} item alerts` : 'All clear'}
              </Text>
            </View>

            <View style={styles.shadowWrap}>
              <GlassSurface
                depth="card"
                intensity={70}
                overlayColor={getAdminSurfaceColor('card')}
                style={styles.alertCard}
              >
                <Text style={styles.alertTitle}>
                  {unavailableItems.length
                    ? `${unavailableItems[0]?.name || 'Menu item'} needs restocking`
                    : 'No stock warnings are active right now'}
                </Text>
                <Text style={styles.alertText}>
                  {unavailableItems.length
                    ? 'One or more menu items are currently unavailable. Review availability and bring the menu back online when stock returns.'
                    : 'Menu availability looks healthy. Review the menu board anytime if you want to archive or relaunch items.'}
                </Text>

                <PrimaryButton
                  title="Restock Now"
                  onPress={() => navigation.navigate(ADMIN_ROUTES.MENU_MANAGEMENT)}
                />
              </GlassSurface>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Brew Equipment Status</Text>
              <Text style={styles.sectionMeta}>
                {shopTiming.openTime && shopTiming.closeTime
                  ? `${shopTiming.openTime} - ${shopTiming.closeTime}`
                  : 'Timing sync pending'}
              </Text>
            </View>

            <View style={styles.equipmentRow}>
              <View style={[styles.shadowWrap, styles.equipmentItem]}>
                <GlassSurface
                  depth="card"
                  intensity={66}
                  overlayColor={getAdminSurfaceColor('card')}
                  style={styles.equipmentCard}
                >
                  <Text style={styles.equipmentLabel}>Temperature</Text>
                  <Text style={styles.equipmentValue}>--°C</Text>
                  <Text style={styles.equipmentMeta}>Telemetry pending</Text>
                </GlassSurface>
              </View>

              <View style={[styles.shadowWrap, styles.equipmentItem]}>
                <GlassSurface
                  depth="card"
                  intensity={66}
                  overlayColor={getAdminSurfaceColor('card')}
                  style={styles.equipmentCard}
                >
                  <Text style={styles.equipmentLabel}>Pressure</Text>
                  <Text style={styles.equipmentValue}>-- bar</Text>
                  <Text style={styles.equipmentMeta}>
                    {primaryAddress?.address || 'Awaiting sensor feed'}
                  </Text>
                </GlassSurface>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenTransition>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: adminPalette.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 12,
    gap: 20,
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  decorGlowTop: {
    position: 'absolute',
    top: -72,
    right: -48,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  decorGlowBottom: {
    position: 'absolute',
    top: 360,
    left: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  titleBlock: {
    gap: 10,
  },
  eyebrow: {
    color: adminPalette.caramelSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: adminPalette.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: adminPalette.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  errorWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  errorCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 16,
  },
  errorText: {
    color: adminPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  halfStat: {
    width: '48.2%',
  },
  section: {
    gap: 12,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: adminPalette.text,
    fontSize: 23,
    fontWeight: '800',
  },
  sectionMeta: {
    color: adminPalette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  shadowWrap: {
    ...adminShadow,
    borderRadius: adminRadius.card,
  },
  sectionCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    gap: 14,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  orderCopy: {
    flex: 1,
    gap: 4,
  },
  orderCustomer: {
    color: adminPalette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  orderItem: {
    color: adminPalette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  orderMetaBlock: {
    alignItems: 'flex-end',
    gap: 8,
  },
  orderPrice: {
    color: adminPalette.caramelSoft,
    fontSize: 15,
    fontWeight: '900',
  },
  orderTime: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  alertCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    gap: 14,
  },
  alertTitle: {
    color: adminPalette.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  alertText: {
    color: adminPalette.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  equipmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  equipmentItem: {
    flex: 1,
  },
  equipmentCard: {
    borderRadius: adminRadius.card,
    overflow: 'hidden',
    padding: 18,
    minHeight: 152,
    justifyContent: 'space-between',
  },
  equipmentLabel: {
    color: adminPalette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  equipmentValue: {
    color: adminPalette.text,
    fontSize: 30,
    fontWeight: '900',
  },
  equipmentMeta: {
    color: adminPalette.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
});
