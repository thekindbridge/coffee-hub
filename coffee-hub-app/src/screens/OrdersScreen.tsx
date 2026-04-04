import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCartState } from '../app/providers/CartProvider';
import { ScalePressable } from '../components/ui/ScalePressable';
import { ScreenTransition } from '../components/ui/ScreenTransition';
import { TAB_ROUTES } from '../constants/routes';
import { useOrders } from '../hooks/useOrders';
import type { MainTabParamList } from '../navigation/types';
import { animateLayout, useTheme, useThemedStyles } from '../theme';
import type { Order } from '../types';
import { formatCurrency } from '../utils/formatCurrency';

type OrdersNavigation = BottomTabNavigationProp<MainTabParamList>;

const formatOrderDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown date';
  }

  return parsedDate.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

function useStatusToneMap() {
  const { theme } = useTheme();

  return useMemo(() => ({
    Pending: {
      background: theme.colors.surfaceMuted,
      border: theme.colors.borderStrong,
      text: theme.colors.textMuted,
    },
    Accepted: {
      background: theme.colors.successSurface,
      border: theme.colors.success,
      text: theme.colors.success,
    },
    Preparing: {
      background: theme.colors.warningSurface,
      border: theme.colors.warning,
      text: theme.colors.warning,
    },
    'Out for Delivery': {
      background: theme.colors.tag,
      border: theme.colors.secondary,
      text: theme.colors.primary,
    },
    Delivered: {
      background: theme.colors.successSurface,
      border: theme.colors.success,
      text: theme.colors.success,
    },
    Rejected: {
      background: theme.colors.dangerSurface,
      border: theme.colors.danger,
      text: theme.colors.danger,
    },
    Cancelled: {
      background: theme.colors.dangerSurface,
      border: theme.colors.danger,
      text: theme.colors.danger,
    },
  }), [theme]);
}

function OrderCard({
  isHighlighted,
  order,
}: {
  isHighlighted: boolean;
  order: Order;
}) {
  const styles = useThemedStyles(createStyles);
  const statusToneMap = useStatusToneMap();
  const [isExpanded, setIsExpanded] = useState(false);
  const statusTone = statusToneMap[order.status as keyof typeof statusToneMap] ?? statusToneMap.Pending;
  const previewItems = order.items?.slice(0, 2) ?? [];

  return (
    <View style={[styles.orderCard, isHighlighted ? styles.highlightedCard : null]}>
      <View style={styles.orderHeader}>
        <View style={styles.orderMeta}>
          <Text style={styles.cardEyebrow}>Order ID</Text>
          <Text style={styles.orderId}>#{order.id}</Text>
          <Text style={styles.orderDate}>{formatOrderDate(order.created_at)}</Text>
        </View>

        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: statusTone.background,
              borderColor: statusTone.border,
            },
          ]}
        >
          <Text style={[styles.statusChipText, { color: statusTone.text }]}>{order.status}</Text>
        </View>
      </View>

      <Text style={styles.orderHint}>
        {order.status_code === 'DELIVERED'
          ? 'Delivered order'
          : order.status_code === 'REJECTED'
            ? 'Order was rejected by the kitchen'
            : order.status_code === 'CANCELLED'
              ? 'Order was cancelled'
              : 'Order is currently in progress'}
      </Text>

      <View style={styles.itemPreview}>
        {previewItems.length > 0 ? (
          previewItems.map(item => (
            <Text key={item.id} style={styles.itemLine}>
              {item.name} x{item.quantity}
            </Text>
          ))
        ) : (
          <Text style={styles.itemLine}>Order items will appear here.</Text>
        )}
        {(order.items?.length ?? 0) > 2 ? (
          <Text style={styles.moreItemsText}>+{(order.items?.length ?? 0) - 2} more items</Text>
        ) : null}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          {formatCurrency(order.total_amount || order.final_total || 0)}
        </Text>
      </View>

      {(order.rejection_reason || order.cancellation_reason) ? (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>
            {order.rejection_reason ? 'Rejection reason' : 'Cancellation reason'}
          </Text>
          <Text style={styles.reasonText}>
            {order.rejection_reason || order.cancellation_reason}
          </Text>
        </View>
      ) : null}

      <ScalePressable
        onPress={() => {
          animateLayout();
          setIsExpanded(previous => !previous);
        }}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>
          {isExpanded ? 'Hide details' : 'View details'}
        </Text>
      </ScalePressable>

      {isExpanded ? (
        <View style={styles.detailsCard}>
          <Text style={styles.cardEyebrow}>Order details</Text>
          <View style={styles.detailsList}>
            {(order.items?.length ?? 0) > 0 ? (
              order.items!.map(item => (
                <View key={`detail-${item.id}`} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {item.name} x{item.quantity}
                  </Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.itemLine}>No item details found for this order.</Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function OrdersScreen() {
  const navigation = useNavigation<OrdersNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { currentUserId, isAuthReady, placedOrder, setPlacedOrder } = useCartState();
  const { activeOrders, error, isLoading, orders, pastOrders, refreshOrders } = useOrders({
    currentUserId,
    optimisticOrder: placedOrder,
  });

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

  const emptyTitle = useMemo(
    () => (isAuthReady ? 'No orders yet' : 'Loading your account'),
    [isAuthReady],
  );
  const emptySubtitle = useMemo(
    () => (
      isAuthReady
        ? 'Place your first order and track it here.'
        : 'Once your account details finish loading, your order history will appear here.'
    ),
    [isAuthReady],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      refreshControl={(
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            void refreshOrders();
          }}
          tintColor={theme.colors.primary}
        />
      )}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTransition>
        <Text style={styles.sectionEyebrow}>History</Text>
        <Text style={styles.pageTitle}>Orders</Text>

        {error ? (
          <View style={[styles.noticeCard, styles.errorNotice]}>
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        {orders.length === 0 && !isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyText}>{emptySubtitle}</Text>
            {isAuthReady ? (
              <ScalePressable
                onPress={() => navigation.navigate(TAB_ROUTES.MENU)}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Browse Menu</Text>
              </ScalePressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Active orders</Text>
              <Text style={styles.sectionTitle}>In progress</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeOrders.length}</Text>
            </View>
          </View>

          {activeOrders.length > 0 ? (
            <View style={styles.list}>
              {activeOrders.map((order, index) => (
                <OrderCard
                  key={order.doc_id || order.id}
                  isHighlighted={index === 0 && placedOrder?.id === order.id}
                  order={order}
                />
              ))}
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>No active orders right now.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Past orders</Text>
              <Text style={styles.sectionTitle}>History</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pastOrders.length}</Text>
            </View>
          </View>

          {pastOrders.length > 0 ? (
            <View style={styles.list}>
              {pastOrders.map(order => (
                <OrderCard
                  key={order.doc_id || order.id}
                  isHighlighted={false}
                  order={order}
                />
              ))}
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>
                Delivered, rejected, and cancelled orders will appear here.
              </Text>
            </View>
          )}
        </View>
      </ScreenTransition>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenContent: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  pageTitle: {
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  noticeCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorNotice: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSurface,
  },
  noticeText: {
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  emptyCard: {
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptyText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  primaryButton: {
    minHeight: 50,
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionEyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: theme.typography.subheading,
    fontWeight: '700',
    color: theme.colors.text,
  },
  countBadge: {
    minWidth: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  countBadgeText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  list: {
    gap: theme.spacing.md,
  },
  placeholderCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  placeholderText: {
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  orderCard: {
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  highlightedCard: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceRaised,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  orderMeta: {
    flex: 1,
  },
  cardEyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  orderId: {
    marginTop: 4,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  orderDate: {
    marginTop: 4,
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  statusChipText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
  },
  orderHint: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  itemPreview: {
    marginTop: theme.spacing.md,
    gap: 4,
  },
  itemLine: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  moreItemsText: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  totalLabel: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  reasonCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSurface,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  reasonTitle: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.danger,
  },
  reasonText: {
    marginTop: 6,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.danger,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    marginTop: theme.spacing.md,
  },
  secondaryButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailsCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  detailsList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  detailValue: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
