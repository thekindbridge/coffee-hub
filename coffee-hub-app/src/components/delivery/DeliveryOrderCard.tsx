import { StyleSheet, Text, View } from 'react-native';
import { CardContainer } from '../ui/CardContainer';
import { ScalePressable } from '../ui/ScalePressable';
import { formatShortDate, formatShortTime } from '../../delivery-agent/utils/formatTime';
import {
  formatCurrencyAmount,
  getDeliveryEventTimestamp,
} from '../../delivery-agent/utils/orderHelpers';
import { useTheme, useThemedStyles } from '../../theme';
import type { Order } from '../../types';

type DeliveryOrderCardProps = {
  onPress?: () => void;
  order: Order;
};

export function DeliveryOrderCard({ onPress, order }: DeliveryOrderCardProps) {
  const styles = useThemedStyles(createStyles);
  const Wrapper = onPress ? ScalePressable : View;
  const wrapperProps = onPress
    ? {
        accessibilityRole: 'button' as const,
        onPress,
        scaleTo: 0.985,
      }
    : {};

  return (
    <Wrapper {...wrapperProps}>
      <CardContainer style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.orderId}>#{order.id}</Text>
            <Text style={styles.orderMeta}>
              {formatShortDate(order.created_at)} at {formatShortTime(order.created_at)}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusLabel}>{order.status}</Text>
          </View>
        </View>

        <Text style={styles.customerName}>{order.customer_name || 'Customer'}</Text>
        <Text style={styles.addressText} numberOfLines={2}>
          {order.address || 'No delivery address provided'}
        </Text>

        <View style={styles.footer}>
          <View>
            <Text style={styles.amountLabel}>Order total</Text>
            <Text style={styles.amountValue}>{formatCurrencyAmount(order.final_total ?? order.total_amount)}</Text>
          </View>

          <View style={styles.metaStack}>
            <Text style={styles.itemCount}>
              {order.items?.length ?? 0} item{(order.items?.length ?? 0) === 1 ? '' : 's'}
            </Text>
            <Text style={styles.eventTime}>
              {formatShortTime(getDeliveryEventTimestamp(order))}
            </Text>
          </View>
        </View>
      </CardContainer>
    </Wrapper>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  orderId: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  orderMeta: {
    marginTop: 4,
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.tag,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  statusLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  customerName: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  addressText: {
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  amountLabel: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  amountValue: {
    marginTop: 4,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  metaStack: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemCount: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  eventTime: {
    marginTop: 4,
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
