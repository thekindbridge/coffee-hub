import { StyleSheet, Text, View } from 'react-native';
import { DeliveryOrderCard } from './DeliveryOrderCard';
import { CardContainer } from '../ui/CardContainer';
import { useTheme, useThemedStyles } from '../../theme';
import type { Order } from '../../types';

type DeliveryOrderListProps = {
  emptyDescription: string;
  emptyTitle: string;
  onPressOrder?: (order: Order) => void;
  orders: Order[];
};

export function DeliveryOrderList({
  emptyDescription,
  emptyTitle,
  onPressOrder,
  orders,
}: DeliveryOrderListProps) {
  const styles = useThemedStyles(createStyles);

  if (orders.length === 0) {
    return (
      <CardContainer style={styles.emptyCard} variant="tinted">
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyDescription}>{emptyDescription}</Text>
      </CardContainer>
    );
  }

  return (
    <View style={styles.list}>
      {orders.map(order => (
        <DeliveryOrderCard
          key={order.doc_id}
          onPress={onPressOrder ? () => onPressOrder(order) : undefined}
          order={order}
        />
      ))}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  emptyCard: {
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptyDescription: {
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
});
