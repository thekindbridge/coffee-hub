import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartState } from '../app/providers/CartProvider';
import { GlassSurface } from '../components/ui/GlassSurface';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { TAB_ROUTES } from '../constants/routes';
import { useProfileData } from '../features/profile/hooks/useProfileData';
import { getProfileInitials } from '../features/profile/lib/profileMappers';
import { useOrders } from '../hooks/useOrders';
import type { MainTabParamList } from '../navigation/types';
import {
  getOrderStatusLabel,
  normalizeOrderStatusCode,
} from '../shared/orderStatus';
import { useTheme, useThemedStyles } from '../theme';
import type { Order } from '../types';
import { formatCurrency } from '../utils/formatCurrency';

type OrdersNavigation = BottomTabNavigationProp<MainTabParamList>;
type OrderMode = 'delivery' | 'pickup';

const SCREEN_BACKGROUND = '#151311';
const SURFACE_CARD = '#221F1D';
const SURFACE_CARD_HIGH = '#2C2927';
const SURFACE_CARD_SOFT = '#191614';
const ACCENT = '#F2BE8C';
const ACCENT_DEEP = '#D4A373';
const TEXT_PRIMARY = '#F7E9DE';
const TEXT_SECONDARY = '#D4C4B7';
const TEXT_MUTED = 'rgba(212, 196, 183, 0.64)';
const TIMELINE_DIM = 'rgba(242, 231, 225, 0.18)';
const HISTORY_PREVIEW_COUNT = 3;

const DELIVERY_STEPS = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'] as const;
const PICKUP_STEPS = ['Placed', 'Processed', 'Ready'] as const;

const getOrderTotal = (order: Order) => Number(order.final_total ?? order.total_amount ?? 0);

const getOrderSummary = (order: Order) => {
  if (order.items?.length) {
    return order.items
      .map(item => `${item.quantity}x ${item.name}`)
      .join(', ');
  }

  return 'Freshly queued by Coffee Hub.';
};

const hasPickupSignal = (order: Order) => (
  Boolean(order.ready_for_pickup_at)
  && !order.delivery_out_for_delivery_at
  && !order.delivery_agent_id
);

const getOrderMode = (order: Order): OrderMode => (
  hasPickupSignal(order) ? 'pickup' : 'delivery'
);

const getTimelineIndex = (order: Order, mode: OrderMode) => {
  const normalizedStatus = normalizeOrderStatusCode(order.status_code);

  if (mode === 'pickup') {
    if (hasPickupSignal(order) || normalizedStatus === 'DELIVERED') {
      return 2;
    }

    if (normalizedStatus === 'ACCEPTED' || normalizedStatus === 'PREPARING') {
      return 1;
    }

    return 0;
  }

  switch (normalizedStatus) {
    case 'ACCEPTED':
    case 'PREPARING':
      return 1;
    case 'OUT_FOR_DELIVERY':
      return 2;
    case 'DELIVERED':
      return 3;
    default:
      return 0;
  }
};

const getStatusMeta = (order: Order, mode: OrderMode) => {
  const normalizedStatus = normalizeOrderStatusCode(order.status_code);

  if (mode === 'pickup') {
    if (hasPickupSignal(order)) {
      return 'READY FOR PICKUP';
    }

    if (normalizedStatus === 'PENDING') {
      return 'WAITING FOR CAFE';
    }

    return 'BREWING NOW';
  }

  switch (normalizedStatus) {
    case 'PENDING':
      return 'WAITING FOR CAFE';
    case 'ACCEPTED':
    case 'PREPARING':
      return 'PREPARING NOW';
    case 'OUT_FOR_DELIVERY':
      return 'ON THE WAY';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'REJECTED':
      return 'REJECTED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return getOrderStatusLabel(normalizedStatus).toUpperCase();
  }
};

const formatOrderDate = (value: string, withYear = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
};

const getPastOrderTitle = (order: Order) => {
  const firstItemName = order.items?.[0]?.name?.trim();

  if (firstItemName) {
    if ((order.items?.length ?? 0) > 1) {
      return `${firstItemName} Bundle`;
    }

    return firstItemName;
  }

  return `Order #${order.id}`;
};

const getPastOrderMeta = (order: Order) => {
  const itemCount = order.items?.length ?? 0;
  const itemLabel = `${itemCount} item${itemCount === 1 ? '' : 's'}`;

  return `${formatOrderDate(order.created_at, true)} • ${itemLabel}`;
};

const getPastOrderIcon = (order: Order): keyof typeof Ionicons.glyphMap => {
  const name = order.items?.[0]?.name?.trim().toLowerCase() || '';

  if (name.includes('bean')) {
    return 'bag-handle-outline';
  }

  if (name.includes('pastry') || name.includes('brownie') || name.includes('croissant')) {
    return 'restaurant-outline';
  }

  return 'cafe-outline';
};

function OrdersTimeline({
  currentIndex,
  mode,
}: {
  currentIndex: number;
  mode: OrderMode;
}) {
  const styles = useThemedStyles(createStyles);
  const steps = mode === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;

  return (
    <View style={styles.timelineWrap}>
      <View style={styles.timelineRow}>
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <View key={step} style={styles.timelineStep}>
              {index < steps.length - 1 ? (
                <View style={styles.timelineConnectorTrack}>
                  <View
                    style={[
                      styles.timelineConnectorFill,
                      index < currentIndex ? styles.timelineConnectorFillActive : null,
                    ]}
                  />
                </View>
              ) : null}

              <View style={styles.timelineDotWrap}>
                <View
                  style={[
                    styles.timelineDot,
                    isActive ? styles.timelineDotActive : null,
                    isCurrent ? styles.timelineDotCurrent : null,
                  ]}
                />
              </View>

              <Text
                numberOfLines={mode === 'delivery' ? 2 : 1}
                style={[
                  styles.timelineLabel,
                  isActive ? styles.timelineLabelActive : null,
                ]}
              >
                {step.toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ActiveOrderCard({
  onPrimaryAction,
  order,
}: {
  onPrimaryAction: (order: Order) => void;
  order: Order;
}) {
  const styles = useThemedStyles(createStyles);
  const mode = getOrderMode(order);
  const currentIndex = getTimelineIndex(order, mode);
  const actionLabel = mode === 'pickup' ? 'Show QR Code' : 'Track Order';
  const actionIcon = mode === 'pickup' ? 'qr-code-outline' : 'navigate-outline';

  return (
    <View style={styles.activeCard}>
      <View style={styles.activeCardHeader}>
        <View style={styles.activeCardCopy}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <Text numberOfLines={2} style={styles.orderSummary}>
            {getOrderSummary(order)}
          </Text>
        </View>

        <View style={styles.activeCardAside}>
          <Text numberOfLines={1} style={styles.orderPrice}>
            {formatCurrency(getOrderTotal(order))}
          </Text>
          <Text numberOfLines={2} style={styles.orderStatusMeta}>
            {getStatusMeta(order, mode)}
          </Text>
        </View>
      </View>

      <OrdersTimeline currentIndex={currentIndex} mode={mode} />

      <PrimaryButton
        title={actionLabel}
        onPress={() => onPrimaryAction(order)}
        icon={<Ionicons color={SCREEN_BACKGROUND} name={actionIcon} size={17} />}
        style={styles.orderAction}
      />
    </View>
  );
}

function PastOrderCard({ order }: { order: Order }) {
  const styles = useThemedStyles(createStyles);
  const statusLabel = getOrderStatusLabel(order.status_code).toUpperCase();

  return (
    <View style={styles.pastCard}>
      <View style={styles.pastIconWrap}>
        <Ionicons color={ACCENT} name={getPastOrderIcon(order)} size={18} />
      </View>

      <View style={styles.pastCopy}>
        <Text numberOfLines={1} style={styles.pastTitle}>
          {getPastOrderTitle(order)}
        </Text>
        <Text numberOfLines={1} style={styles.pastMeta}>
          {getPastOrderMeta(order)}
        </Text>
      </View>

      <View style={styles.pastAside}>
        <Text numberOfLines={1} style={styles.pastPrice}>
          {formatCurrency(getOrderTotal(order))}
        </Text>
        <Text numberOfLines={1} style={styles.pastStatus}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

export function OrdersScreen() {
  const navigation = useNavigation<OrdersNavigation>();
  const styles = useThemedStyles(createStyles);
  const { currentUserId, isAuthReady, placedOrder, setPlacedOrder } = useCartState();
  const {
    activeOrders,
    error,
    isLoading,
    orders,
    pastOrders,
    refreshOrders,
  } = useOrders({
    currentUserId,
    optimisticOrder: placedOrder,
  });
  const {
    authPhotoUrl,
    profileDisplayName,
  } = useProfileData();
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshOrders();
    }, [refreshOrders]),
  );

  useEffect(() => {
    if (!placedOrder) {
      return;
    }

    const existsInOrders = orders.some(order => (
      order.doc_id === placedOrder.doc_id || order.id === placedOrder.id
    ));

    if (existsInOrders) {
      setPlacedOrder(null);
    }
  }, [orders, placedOrder, setPlacedOrder]);

  useEffect(() => {
    if (pastOrders.length <= HISTORY_PREVIEW_COUNT && isHistoryExpanded) {
      setIsHistoryExpanded(false);
    }
  }, [isHistoryExpanded, pastOrders.length]);

  const activeItemsLabel = useMemo(() => (
    `${activeOrders.length} ${activeOrders.length === 1 ? 'item' : 'items'}`
  ), [activeOrders.length]);

  const showErrorMessageCard = Boolean(error) && orders.length > 0;

  const visiblePastOrders = useMemo(
    () => (isHistoryExpanded ? pastOrders : pastOrders.slice(0, HISTORY_PREVIEW_COUNT)),
    [isHistoryExpanded, pastOrders],
  );

  const emptyTitle = useMemo(
    () => (isAuthReady ? 'No orders yet' : 'Loading your account'),
    [isAuthReady],
  );
  const emptySubtitle = useMemo(
    () => (
      !isAuthReady
        ? 'Once the account is ready, your active and past orders will sync into this screen.'
        : error
          ? 'We could not sync live orders right now. This screen stays available, and your next coffee run will appear here once the connection recovers.'
          : 'Your next coffee order will appear here with a premium timeline and status card.'
    ),
    [error, isAuthReady],
  );

  const handlePrimaryAction = useCallback((order: Order) => {
    if (getOrderMode(order) === 'pickup') {
      Alert.alert(
        `Order #${order.id}`,
        'Pickup QR is not wired into the current mobile flow yet. Keep this screen open and show the order number at the counter.',
      );
      return;
    }

    Alert.alert(
      'Tracking status',
      'Live customer map tracking is not available in the current mobile routes yet. This screen will continue to reflect the latest delivery stage.',
    );
  }, []);

  const profileInitials = getProfileInitials(profileDisplayName);

  useEffect(() => {
    console.log('[OrdersScreen] state', {
      activeCount: activeOrders.length,
      currentUserId,
      error,
      isAuthReady,
      isLoading,
      orderCount: orders.length,
      pastCount: pastOrders.length,
    });
  }, [
    activeOrders.length,
    currentUserId,
    error,
    isAuthReady,
    isLoading,
    orders.length,
    pastOrders.length,
  ]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void refreshOrders();
            }}
            tintColor={ACCENT}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition style={styles.flow}>
          <View style={styles.headerShell}>
            <View style={styles.brandRow}>
              <View style={styles.brandWrap}>
                <View style={styles.brandIconWrap}>
                  <Ionicons color={ACCENT} name="cafe" size={16} />
                </View>
                <Text style={styles.brandLabel}>Coffee Hub</Text>
              </View>

              <ScalePressable
                accessibilityRole="button"
                onPress={() => navigation.navigate(TAB_ROUTES.PROFILE)}
                scaleTo={0.96}
                style={styles.avatarButton}
              >
                <GlassSurface
                  depth="card"
                  intensity={70}
                  overlayColor="rgba(66, 51, 46, 0.72)"
                  style={styles.avatarSurface}
                >
                  {authPhotoUrl ? (
                    <Image source={{ uri: authPhotoUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{profileInitials}</Text>
                  )}
                </GlassSurface>
              </ScalePressable>
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.headerEyebrow}>Real-Time Status</Text>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>Active Orders</Text>
                <Text style={styles.headerMeta}>{activeItemsLabel}</Text>
              </View>
            </View>
          </View>

          {showErrorMessageCard ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>Unable to load orders</Text>
              <Text style={styles.messageText}>{error}</Text>
            </View>
          ) : null}

          {orders.length === 0 && !isLoading ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons color={ACCENT} name="receipt-outline" size={22} />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyText}>{emptySubtitle}</Text>
              {isAuthReady ? (
                <PrimaryButton
                  title="Browse Menu"
                  onPress={() => navigation.navigate(TAB_ROUTES.MENU)}
                  style={styles.emptyAction}
                />
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.activeList}>
                {activeOrders.length > 0 ? activeOrders.map(order => (
                  <ActiveOrderCard
                    key={order.doc_id || order.id}
                    onPrimaryAction={handlePrimaryAction}
                    order={order}
                  />
                )) : (
                  <View style={styles.sectionStateCard}>
                    <Text style={styles.sectionStateTitle}>No active orders right now</Text>
                    <Text style={styles.sectionStateText}>
                      Fresh orders will appear here the moment the cafe starts moving on them.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Orders</Text>

                {visiblePastOrders.length > 0 ? (
                  <View style={styles.pastList}>
                    {visiblePastOrders.map(order => (
                      <PastOrderCard key={`past-${order.doc_id || order.id}`} order={order} />
                    ))}
                  </View>
                ) : (
                  <View style={styles.sectionStateCard}>
                    <Text style={styles.sectionStateTitle}>No past orders yet</Text>
                    <Text style={styles.sectionStateText}>
                      Delivered orders and completed coffee runs will settle here automatically.
                    </Text>
                  </View>
                )}

                {!isHistoryExpanded && pastOrders.length > HISTORY_PREVIEW_COUNT ? (
                  <ScalePressable
                    accessibilityRole="button"
                    onPress={() => setIsHistoryExpanded(true)}
                    scaleTo={0.98}
                    style={styles.historyButton}
                  >
                    <Text style={styles.historyButtonText}>VIEW FULL HISTORY</Text>
                  </ScalePressable>
                ) : null}
              </View>
            </>
          )}
        </ScreenTransition>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: 136,
  },
  flow: {
    gap: theme.spacing.xxl,
  },
  headerShell: {
    gap: theme.spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242, 190, 140, 0.12)',
  },
  brandLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: ACCENT,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarSurface: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: SURFACE_CARD_HIGH,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  titleBlock: {
    gap: 10,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: ACCENT_DEEP,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  headerMeta: {
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  messageCard: {
    borderRadius: theme.radius.xl,
    backgroundColor: SURFACE_CARD,
    padding: theme.spacing.xl,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  messageTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },
  emptyCard: {
    borderRadius: theme.radius.xl,
    backgroundColor: SURFACE_CARD,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 10,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE_CARD_HIGH,
  },
  emptyTitle: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_SECONDARY,
  },
  emptyAction: {
    marginTop: 4,
    borderRadius: 20,
    minHeight: 54,
  },
  activeList: {
    gap: theme.spacing.xl,
  },
  activeCard: {
    borderRadius: theme.radius.xl,
    backgroundColor: SURFACE_CARD,
    padding: 22,
    gap: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 34,
    elevation: 12,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  activeCardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  orderId: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  orderSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },
  activeCardAside: {
    width: 108,
    alignItems: 'flex-end',
    gap: 8,
  },
  orderPrice: {
    fontSize: 31,
    lineHeight: 32,
    fontWeight: '900',
    color: ACCENT,
  },
  orderStatusMeta: {
    textAlign: 'right',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: TEXT_MUTED,
  },
  timelineWrap: {
    borderRadius: 18,
    backgroundColor: SURFACE_CARD_SOFT,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    gap: 10,
  },
  timelineConnectorTrack: {
    position: 'absolute',
    top: 8,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: TIMELINE_DIM,
  },
  timelineConnectorFill: {
    width: '100%',
    height: 2,
    backgroundColor: TIMELINE_DIM,
  },
  timelineConnectorFillActive: {
    backgroundColor: ACCENT,
  },
  timelineDotWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(242, 231, 225, 0.28)',
  },
  timelineDotActive: {
    backgroundColor: ACCENT,
  },
  timelineDotCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineLabel: {
    minHeight: 24,
    paddingHorizontal: 2,
    textAlign: 'center',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: 'rgba(242, 231, 225, 0.38)',
  },
  timelineLabelActive: {
    color: ACCENT_DEEP,
  },
  orderAction: {
    alignSelf: 'center',
    width: '76%',
    minHeight: 54,
    borderRadius: 20,
    marginTop: 2,
  },
  section: {
    gap: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  sectionStateCard: {
    borderRadius: theme.radius.xl,
    backgroundColor: SURFACE_CARD,
    padding: theme.spacing.xl,
    gap: 8,
  },
  sectionStateTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  sectionStateText: {
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },
  pastList: {
    gap: theme.spacing.md,
  },
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    backgroundColor: SURFACE_CARD,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pastIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE_CARD_HIGH,
  },
  pastCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  pastTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  pastMeta: {
    fontSize: 11,
    lineHeight: 14,
    color: TEXT_MUTED,
  },
  pastAside: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pastPrice: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  pastStatus: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    color: TEXT_MUTED,
  },
  historyButton: {
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  historyButtonText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: ACCENT_DEEP,
  },
});
