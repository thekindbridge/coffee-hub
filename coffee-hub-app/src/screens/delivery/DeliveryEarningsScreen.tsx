import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { DeliveryEarningsCard } from '../../components/delivery/DeliveryEarningsCard';
import { DeliveryOrderList } from '../../components/delivery/DeliveryOrderList';
import {
  buildDeliveryEarningsSummary,
  formatCurrencyAmount,
  formatShortDate,
  useDeliveryAgentModule,
} from '../../delivery-agent';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { RoleScreenFrame } from '../../features/roles/components/RoleScreenFrame';
import { useTheme, useThemedStyles } from '../../theme';
import type { DeliveryStackParamList } from '../../navigation/types';

type DeliveryNavigation = NativeStackNavigationProp<DeliveryStackParamList>;

export function DeliveryEarningsScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const styles = useThemedStyles(createStyles);
  const { completedOrders } = useDeliveryAgentModule();
  const summary = buildDeliveryEarningsSummary(completedOrders);

  return (
    <RoleScreenFrame
      eyebrow="Delivery agent"
      title="Earnings"
      subtitle="Use your completed deliveries to track totals, average order value, and the most recent payout-driving order."
    >
      <View style={styles.summaryRow}>
        <DeliveryEarningsCard
          title="Delivered total"
          value={formatCurrencyAmount(summary.totalAmount)}
          caption={`${summary.completedCount} completed orders`}
        />
        <DeliveryEarningsCard
          title="Average order"
          value={formatCurrencyAmount(summary.averageOrderValue)}
          caption={summary.lastDeliveredAt
            ? `Last delivered ${formatShortDate(summary.lastDeliveredAt)}`
            : 'No deliveries completed yet'}
        />
      </View>

      <Text style={styles.sectionTitle}>Completed delivery history</Text>
      <View style={styles.listWrap}>
        <DeliveryOrderList
          emptyDescription="Finish a delivery and it will appear here automatically."
          emptyTitle="No earnings yet"
          onPressOrder={order => {
            navigation.navigate(DELIVERY_ROUTES.ORDER_DETAILS, {
              orderDocId: order.doc_id,
            });
          }}
          orders={completedOrders}
        />
      </View>
    </RoleScreenFrame>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  summaryRow: {
    flexDirection: 'column',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    marginTop: theme.spacing.xl,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  listWrap: {
    marginTop: theme.spacing.md,
  },
});
