import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { DeliveryOrderCard } from '../../components/delivery/DeliveryOrderCard';
import { CardContainer } from '../../components/ui/CardContainer';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useDeliveryAgentModule } from '../../delivery-agent';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { RoleScreenFrame } from '../../features/roles/components/RoleScreenFrame';
import { useTheme, useThemedStyles } from '../../theme';
import type { DeliveryStackParamList } from '../../navigation/types';

type DeliveryNavigation = NativeStackNavigationProp<DeliveryStackParamList>;

export function DeliveryDashboardScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const styles = useThemedStyles(createStyles);
  const {
    activeOrders,
    agentLastTrackedLocation,
    agentPermissionState,
    agentTrackerStatus,
    completedOrders,
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentDeliverySession,
    handleStartDelivery,
    isAgentTracking,
    isStartingDelivery,
  } = useDeliveryAgentModule();

  const agentStatus = currentDeliveryOrder
    ? 'Busy'
    : currentDeliveryAgent?.status === 'offline'
      ? 'Offline'
      : 'Available';
  const lastTrackedPoint = agentLastTrackedLocation
    ? `${agentLastTrackedLocation.lat.toFixed(5)}, ${agentLastTrackedLocation.lng.toFixed(5)}`
    : 'Waiting for first GPS point';
  const isCurrentOrderLocationReady = Boolean(currentDeliveryOrder?.customer_location);

  return (
    <RoleScreenFrame
      eyebrow="Delivery agent"
      title="Dashboard"
      subtitle="Track the current delivery, monitor your live session, and jump into active orders quickly."
    >
      <CardContainer>
        <Text style={styles.sectionTitle}>Today at a glance</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Agent status</Text>
            <Text style={styles.summaryValue}>{agentStatus}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Active orders</Text>
            <Text style={styles.summaryValue}>{activeOrders.length}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={styles.summaryValue}>{completedOrders.length}</Text>
          </View>
        </View>
      </CardContainer>

      <CardContainer style={styles.section}>
        <Text style={styles.sectionTitle}>Live tracking</Text>
        <Text style={styles.bodyText}>{agentTrackerStatus.message}</Text>
        <View style={styles.trackingGrid}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Tracker</Text>
            <Text style={styles.summaryValueCompact}>
              {isAgentTracking ? 'Streaming' : 'Idle'}
            </Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Permission</Text>
            <Text style={styles.summaryValueCompact}>{agentPermissionState}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Last ping</Text>
            <Text style={styles.summaryValueCompact}>{lastTrackedPoint}</Text>
          </View>
        </View>
        {currentDeliverySession ? (
          <Text style={styles.metaText}>
            Session: {currentDeliverySession.status}
          </Text>
        ) : null}
        {currentDeliveryOrder && !isCurrentOrderLocationReady ? (
          <Text style={styles.warningText}>
            Customer coordinates are missing, so live GPS cannot start until the order location is captured.
          </Text>
        ) : null}
      </CardContainer>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current active order</Text>
        {currentDeliveryOrder ? (
          <>
            <DeliveryOrderCard
              onPress={() => {
                navigation.navigate(DELIVERY_ROUTES.ORDER_DETAILS, {
                  orderDocId: currentDeliveryOrder.doc_id,
                });
              }}
              order={currentDeliveryOrder}
            />

            <View style={styles.actionRow}>
              <PrimaryButton
                title="View details"
                onPress={() => {
                  navigation.navigate(DELIVERY_ROUTES.ORDER_DETAILS, {
                    orderDocId: currentDeliveryOrder.doc_id,
                  });
                }}
                style={styles.actionButton}
                variant="secondary"
              />
              <PrimaryButton
                title={isAgentTracking ? 'Tracking live' : 'Start delivery'}
                disabled={isAgentTracking || !isCurrentOrderLocationReady}
                loading={isStartingDelivery}
                onPress={() => {
                  void handleStartDelivery();
                }}
                style={styles.actionButton}
              />
            </View>
          </>
        ) : (
          <CardContainer variant="tinted">
            <Text style={styles.emptyTitle}>No Active Delivery</Text>
            <Text style={styles.bodyText}>
              Assigned orders will appear here as soon as Firestore moves them to out-for-delivery.
            </Text>
          </CardContainer>
        )}
      </View>
    </RoleScreenFrame>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  summaryTile: {
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  summaryLabel: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  summaryValue: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  bodyText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  metaText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
  },
  warningText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.caption,
    lineHeight: 18,
    color: theme.colors.warning,
  },
  trackingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  summaryValueCompact: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptyTitle: {
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  actionRow: {
    flexDirection: 'column',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
