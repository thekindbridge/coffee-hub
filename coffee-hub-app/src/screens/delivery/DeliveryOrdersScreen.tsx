import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  DeliveryOrderFilterId,
  DELIVERY_ORDER_FILTERS,
  useDeliveryAgentModule,
} from '../../delivery-agent';
import { DeliveryOrderList } from '../../components/delivery/DeliveryOrderList';
import { DeliveryStatusToggle } from '../../components/delivery/DeliveryStatusToggle';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { RoleScreenFrame } from '../../features/roles/components/RoleScreenFrame';
import { useTheme, useThemedStyles } from '../../theme';
import type { DeliveryStackParamList } from '../../navigation/types';

type DeliveryNavigation = NativeStackNavigationProp<DeliveryStackParamList>;

export function DeliveryOrdersScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const styles = useThemedStyles(createStyles);
  const { activeOrders, completedOrders } = useDeliveryAgentModule();
  const [filter, setFilter] = useState<DeliveryOrderFilterId>('active');

  const orders = useMemo(
    () => (filter === 'active' ? activeOrders : completedOrders),
    [activeOrders, completedOrders, filter],
  );

  useEffect(() => {
    if (filter === 'active' && activeOrders.length === 0 && completedOrders.length > 0) {
      setFilter('completed');
      return;
    }

    if (filter === 'completed' && completedOrders.length === 0 && activeOrders.length > 0) {
      setFilter('active');
    }
  }, [activeOrders.length, completedOrders.length, filter]);

  return (
    <RoleScreenFrame
      eyebrow="Delivery agent"
      title="Orders"
      subtitle="Review your active delivery queue and delivered history without leaving the agent workspace."
    >
      <View style={styles.toggleWrap}>
        <DeliveryStatusToggle
          onChange={setFilter}
          options={DELIVERY_ORDER_FILTERS.map(filterOption => ({
            label: filterOption.label,
            value: filterOption.id,
          }))}
          value={filter}
        />
      </View>

      <View style={styles.listWrap}>
        <DeliveryOrderList
          emptyDescription={filter === 'active'
            ? 'New assigned deliveries will show up here in real time.'
            : 'Completed deliveries will move here automatically after you finish them.'}
          emptyTitle={filter === 'active' ? 'No active orders' : 'No completed orders'}
          onPressOrder={order => {
            navigation.navigate(DELIVERY_ROUTES.ORDER_DETAILS, {
              orderDocId: order.doc_id,
            });
          }}
          orders={orders}
        />
      </View>
    </RoleScreenFrame>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  toggleWrap: {
    marginTop: theme.spacing.sm,
  },
  listWrap: {
    marginTop: theme.spacing.lg,
  },
});
