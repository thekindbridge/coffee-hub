import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryBarChart } from '../../components/delivery/DeliveryBarChart';
import { DeliveryTopBar } from '../../components/delivery/DeliveryTopBar';
import { getDeliveryPalette, getDeliveryShadow } from '../../components/delivery/designSystem';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { useDeliveryAgentModule } from '../../delivery-agent';
import { getDeliveryPayoutAmount } from '../../delivery-agent/utils/orderHelpers';
import {
  buildWeeklyChart,
  getAveragePerDelivery,
  getInitials,
  sortRecentOrders,
} from '../../delivery-agent/utils/presentation';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import type { DeliveryStackParamList, DeliveryTabParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../theme';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

type DeliveryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<DeliveryTabParamList>,
  NativeStackNavigationProp<DeliveryStackParamList>
>;

const getPeriodTotal = (
  orders: Order[],
  start: Date,
  end: Date,
  amountSelector: (order: Order) => number,
) => orders.reduce((sum, order) => {
  const value = new Date(order.delivery_delivered_at || order.created_at);
  if (Number.isNaN(value.getTime()) || value < start || value >= end) {
    return sum;
  }

  return sum + amountSelector(order);
}, 0);

export function DeliveryEarningsScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { authPhotoUrl } = useProfileData();
  const { completedOrders, currentDeliveryAgent, currentUserDisplayName } = useDeliveryAgentModule();
  const initials = getInitials(currentDeliveryAgent?.name || currentUserDisplayName);
  const recentOrders = useMemo(() => sortRecentOrders(completedOrders), [completedOrders]);
  const weeklyChart = useMemo(
    () => buildWeeklyChart(completedOrders, getDeliveryPayoutAmount),
    [completedOrders],
  );
  const weeklyRouteEarnings = useMemo(
    () => weeklyChart.reduce((sum, point) => sum + point.total, 0),
    [weeklyChart],
  );
  const completedRuns = completedOrders.length;
  const averagePerDelivery = getAveragePerDelivery(completedOrders, getDeliveryPayoutAmount);
  const handledRevenue = useMemo(
    () => completedOrders.reduce((sum, order) => sum + (order.final_total ?? order.total_amount), 0),
    [completedOrders],
  );
  const growth = useMemo(() => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setHours(0, 0, 0, 0);
    thisWeekStart.setDate(thisWeekStart.getDate() - 6);
    const previousWeekStart = new Date(thisWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(thisWeekStart);

    const currentTotal = getPeriodTotal(completedOrders, thisWeekStart, now, getDeliveryPayoutAmount);
    const previousTotal = getPeriodTotal(
      completedOrders,
      previousWeekStart,
      previousWeekEnd,
      getDeliveryPayoutAmount,
    );
    if (!previousTotal) {
      return currentTotal > 0 ? 100 : 0;
    }

    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  }, [completedOrders]);

  const renderHistoryItem = ({ item }: ListRenderItemInfo<Order>) => {
    const routeEarning = getDeliveryPayoutAmount(item);
    const deliveredAt = new Date(item.delivery_delivered_at || item.created_at);
    const timestamp = Number.isNaN(deliveredAt.getTime())
      ? 'Time syncing'
      : `${deliveredAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${item.items?.reduce((sum, orderItem) => sum + orderItem.quantity, 0) || 1} items`;

    return (
      <View style={[styles.historyCard, getDeliveryShadow(theme)]}>
        <View style={styles.historyThumb}>
          <Ionicons name="wallet-outline" size={20} color={palette.blush} />
        </View>

        <View style={styles.historyCopy}>
          <Text style={styles.historyTitle}>Delivery #{item.id}</Text>
          <Text style={styles.historySubtitle}>{item.items?.[0]?.name || 'Signature roast'}</Text>
          <Text style={styles.historyMeta}>{timestamp}</Text>
        </View>

        <View style={styles.historyValueBlock}>
          <Text style={styles.historyValue}>+{formatCurrency(routeEarning)}</Text>
          <Text style={styles.historyMetaStrong}>
            {`ORDER ${formatCurrency(item.final_total ?? item.total_amount)}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenTransition style={styles.screen}>
        <FlatList
          data={recentOrders}
          keyExtractor={item => item.doc_id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={styles.headerContent}>
              <DeliveryTopBar
                avatarUrl={authPhotoUrl}
                initials={initials}
                leadingLabel="Coffee Hub"
                onLeadingPress={() => navigation.navigate(DELIVERY_ROUTES.DASHBOARD)}
                onProfilePress={() => navigation.navigate(DELIVERY_ROUTES.PROFILE)}
              />

              <View style={[styles.harvestCard, getDeliveryShadow(theme)]}>
                <View style={styles.harvestRow}>
                  <View>
                    <Text style={styles.harvestEyebrow}>This Week&apos;s Route Earnings</Text>
                    <Text style={styles.harvestValue}>{formatCurrency(weeklyRouteEarnings)}</Text>
                  </View>

                  <View style={styles.growthPill}>
                    <Ionicons name="trending-up" size={14} color={palette.text} />
                    <Text style={styles.growthText}>
                      {growth >= 0 ? '+' : ''}{growth}%
                    </Text>
                  </View>
                </View>

                <Text style={styles.harvestSubtitle}>
                  Delivery earnings are calculated from completed orders with recorded delivery fees.
                </Text>
                <DeliveryBarChart points={weeklyChart} />
              </View>

              <View style={styles.metricStack}>
                <View style={[styles.metricCard, getDeliveryShadow(theme)]}>
                  <View style={styles.metricCardTop}>
                    <View style={styles.metricIconWrap}>
                      <Ionicons name="car-outline" size={16} color={palette.blush} />
                    </View>
                    <Text style={styles.metricTag}>Completed</Text>
                  </View>
                  <Text style={styles.metricValue}>{completedRuns}</Text>
                  <Text style={styles.metricLabel}>Delivered Orders</Text>
                </View>

                <View style={[styles.metricCard, getDeliveryShadow(theme)]}>
                  <View style={styles.metricCardTop}>
                    <View style={styles.metricIconWrap}>
                      <Ionicons name="wallet-outline" size={16} color={palette.blush} />
                    </View>
                    <Text style={styles.metricTag}>Average</Text>
                  </View>
                  <Text style={styles.metricValue}>{formatCurrency(averagePerDelivery)}</Text>
                  <Text style={styles.metricLabel}>Per Completed Delivery</Text>
                </View>

                <View style={[styles.metricCard, getDeliveryShadow(theme)]}>
                  <View style={styles.metricCardTop}>
                    <View style={styles.metricIconWrap}>
                      <Ionicons name="cash-outline" size={16} color={palette.blush} />
                    </View>
                    <Text style={styles.metricTag}>Handled</Text>
                  </View>
                  <Text style={styles.metricValue}>{formatCurrency(handledRevenue)}</Text>
                  <Text style={styles.metricLabel}>Customer Order Revenue</Text>
                </View>
              </View>

              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Recent Deliveries</Text>
                <Text style={styles.sectionAction}>{completedRuns} total</Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={(
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No route earnings yet</Text>
              <Text style={styles.emptyText}>
                Finish a few deliveries and this screen will fill with payout history and delivery summaries.
              </Text>
            </View>
          )}
          ListFooterComponent={(
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Payout controls will appear here once operations connects a real cash-out flow.
              </Text>
            </View>
          )}
        />
      </ScreenTransition>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getDeliveryPalette(theme);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    listContent: {
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 118,
    },
    headerContent: {
      gap: 18,
    },
    harvestCard: {
      borderRadius: 30,
      backgroundColor: '#5A403A',
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    harvestRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    harvestEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      color: '#FFD9C9',
    },
    harvestValue: {
      marginTop: 8,
      fontSize: 26,
      fontWeight: '900',
      color: '#FFF6F1',
    },
    harvestSubtitle: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: '#E9D6CC',
    },
    growthPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    growthText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFF6F1',
    },
    metricStack: {
      gap: 18,
    },
    metricCard: {
      borderRadius: 24,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 18,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 12,
    },
    metricCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    metricIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.cardStrong,
    },
    metricTag: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.text,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '900',
      color: palette.text,
    },
    metricLabel: {
      fontSize: 15,
      color: palette.textMuted,
    },
    sectionRow: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: palette.text,
    },
    sectionAction: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.caramel,
    },
    separator: {
      height: 14,
    },
    historyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 22,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    historyThumb: {
      width: 54,
      height: 54,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.card,
    },
    historyCopy: {
      flex: 1,
      gap: 4,
    },
    historyTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: palette.text,
    },
    historySubtitle: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.text,
    },
    historyMeta: {
      fontSize: 12,
      color: palette.textMuted,
    },
    historyValueBlock: {
      alignItems: 'flex-end',
      gap: 4,
    },
    historyValue: {
      fontSize: 15,
      fontWeight: '900',
      color: palette.text,
    },
    historyMetaStrong: {
      fontSize: 11,
      fontWeight: '800',
      color: palette.textMuted,
    },
    emptyCard: {
      marginTop: 8,
      borderRadius: 24,
      backgroundColor: palette.cardMuted,
      padding: 22,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: palette.text,
    },
    emptyText: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 21,
      color: palette.textMuted,
    },
    footer: {
      marginTop: 22,
    },
    footerText: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.textMuted,
    },
  });
};
