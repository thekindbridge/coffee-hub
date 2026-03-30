import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCartState } from '../app/providers/CartProvider';
import { TAB_ROUTES } from '../constants/routes';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useOrders } from '../hooks/useOrders';
import type { MainTabParamList } from '../navigation/types';
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

const statusToneMap: Record<string, { background: string; border: string; text: string }> = {
  Pending: { background: '#F3EEE8', border: '#E0D4C8', text: COLORS.textMuted },
  Accepted: { background: '#EAF7EF', border: '#C9E9D4', text: COLORS.success },
  Preparing: { background: '#FFF2DE', border: '#F3D6A6', text: '#9C6A18' },
  'Out for Delivery': { background: '#E8F4FB', border: '#C8E0F1', text: '#1F6F99' },
  Delivered: { background: '#EAF7EF', border: '#C9E9D4', text: COLORS.success },
  Rejected: { background: '#FFF1EF', border: '#F4C7C1', text: '#A23D2A' },
  Cancelled: { background: '#FFF1EF', border: '#F4C7C1', text: '#A23D2A' },
};

function OrderCard({
  isHighlighted,
  order,
}: {
  isHighlighted: boolean;
  order: Order;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusTone = statusToneMap[order.status] ?? statusToneMap.Pending;
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

      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed ? styles.pressed : null,
        ]}
        onPress={() => setIsExpanded(previous => !previous)}
      >
        <Text style={styles.secondaryButtonText}>
          {isExpanded ? 'Hide details' : 'View details'}
        </Text>
      </Pressable>

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
    () => (isAuthReady ? 'No orders yet' : 'Preparing your secure session'),
    [isAuthReady],
  );
  const emptySubtitle = useMemo(
    () => (
      isAuthReady
        ? 'Place your first order and track it here.'
        : 'Once the session is ready, your order history will appear here.'
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
          tintColor={COLORS.accent}
        />
      )}
      showsVerticalScrollIndicator={false}
    >
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
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
              onPress={() => navigation.navigate(TAB_ROUTES.MENU)}
            >
              <Text style={styles.primaryButtonText}>Browse Menu</Text>
            </Pressable>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: SPACING.lg, paddingBottom: 120 },
  pageTitle: { fontSize: 30, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  noticeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorNotice: { borderColor: '#F4C7C1', backgroundColor: '#FFF1EF' },
  noticeText: { fontSize: 13, lineHeight: 20, color: COLORS.textMuted },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  emptyText: { marginTop: SPACING.sm, fontSize: 14, lineHeight: 22, color: COLORS.textMuted },
  primaryButton: {
    minHeight: 50,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.surface },
  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.secondary },
  sectionTitle: { marginTop: 4, fontSize: 22, fontWeight: '700', color: COLORS.text },
  countBadge: { minWidth: 38, borderRadius: 19, backgroundColor: COLORS.surfaceDarkAlt, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.inkInverse },
  list: { gap: SPACING.md },
  placeholderCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
  },
  placeholderText: { fontSize: 13, lineHeight: 20, color: COLORS.textMuted },
  orderCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
  },
  highlightedCard: { borderColor: COLORS.secondary, backgroundColor: '#FFF8F0' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  orderMeta: { flex: 1 },
  cardEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted },
  orderId: { marginTop: 4, fontSize: 18, fontWeight: '800', color: COLORS.text },
  orderDate: { marginTop: 4, fontSize: 12, color: COLORS.textMuted },
  statusChip: { borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  orderHint: { marginTop: SPACING.md, fontSize: 13, lineHeight: 20, color: COLORS.textMuted },
  itemPreview: { marginTop: SPACING.md, gap: 4 },
  itemLine: { fontSize: 13, color: COLORS.textMuted },
  moreItemsText: { fontSize: 12, color: COLORS.textMuted },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.md, paddingTop: SPACING.md },
  totalLabel: { fontSize: 14, color: COLORS.textMuted },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.accentStrong },
  reasonCard: { borderRadius: 18, borderWidth: 1, borderColor: '#F4C7C1', backgroundColor: '#FFF1EF', padding: SPACING.md, marginTop: SPACING.md },
  reasonTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#A23D2A' },
  reasonText: { marginTop: 6, fontSize: 13, lineHeight: 20, color: '#A23D2A' },
  secondaryButton: {
    minHeight: 46,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    marginTop: SPACING.md,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  detailsCard: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, padding: SPACING.md, marginTop: SPACING.md },
  detailsList: { gap: SPACING.sm, marginTop: SPACING.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, alignItems: 'center' },
  detailLabel: { flex: 1, fontSize: 13, color: COLORS.textMuted },
  detailValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  pressed: { opacity: 0.84 },
});
