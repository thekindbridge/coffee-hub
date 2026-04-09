import { useMemo } from 'react';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardContainer } from '../../components/ui/CardContainer';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import {
  buildMapsSearchUrl,
  formatCurrencyAmount,
  formatDateTime,
  normalizePhoneForTel,
  useDeliveryAgentModule,
} from '../../delivery-agent';
import { useTheme, useThemedStyles } from '../../theme';
import type { DeliveryStackParamList } from '../../navigation/types';

type DeliveryDetailsRoute = RouteProp<DeliveryStackParamList, 'DeliveryOrderDetails'>;

const openUrl = async (url: string, fallbackTitle: string) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error(`Failed to open ${url}`, error);
    Alert.alert(fallbackTitle, 'Unable to open that action on this device right now.');
  }
};

export function DeliveryOrderDetailsScreen() {
  const route = useRoute<DeliveryDetailsRoute>();
  const styles = useThemedStyles(createStyles);
  const {
    agentLastTrackedLocation,
    agentPermissionState,
    agentTrackerStatus,
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentDeliverySession,
    handleEndDelivery,
    handleStartDelivery,
    isAgentTracking,
    isEndingDelivery,
    isStartingDelivery,
    orders,
  } = useDeliveryAgentModule();

  const order = useMemo(
    () => orders.find(candidate => candidate.doc_id === route.params.orderDocId) || null,
    [orders, route.params.orderDocId],
  );

  const isCurrentActiveOrder = currentDeliveryOrder?.doc_id === order?.doc_id;
  const hasCustomerLocation = Boolean(order?.customer_location);
  const normalizedPhone = normalizePhoneForTel(order?.phone || '');
  const hasAddress = Boolean(order?.address?.trim());
  const canCallCustomer = Boolean(normalizedPhone);
  const canOpenMaps = hasAddress;
  const canStartTracking = Boolean(order && isCurrentActiveOrder && !isAgentTracking && hasCustomerLocation);
  const canCompleteDelivery = Boolean(order && isCurrentActiveOrder);
  const assignedAgentName =
    currentDeliveryAgent?.name ||
    order?.delivery_agent_name ||
    'Assigned agent';
  const assignedAgentPhone =
    currentDeliveryAgent?.phone ||
    order?.delivery_agent_phone ||
    'Phone number not available';
  const assignedAgentVehicle =
    currentDeliveryAgent?.vehicle_type ||
    order?.delivery_agent_vehicle ||
    'Vehicle details not available';
  const trackerToneStyle = agentTrackerStatus.lifecycle === 'watching' || agentTrackerStatus.lifecycle === 'completed'
    ? styles.trackerStateSuccess
    : agentTrackerStatus.lifecycle === 'starting' || agentTrackerStatus.lifecycle === 'restarting'
      ? styles.trackerStateWarning
      : agentTrackerStatus.lifecycle === 'error' || agentTrackerStatus.lifecycle === 'denied'
        ? styles.trackerStateDanger
        : styles.trackerStateNeutral;
  const trackingAvailabilityText = hasCustomerLocation
    ? 'Customer coordinates are ready for live route sharing.'
    : 'Customer coordinates are missing, so live GPS cannot start yet.';

  if (!order) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.content}>
          <CardContainer>
            <Text style={styles.title}>Order not found</Text>
            <Text style={styles.bodyText}>
              This delivery may have moved out of the current agent feed already.
            </Text>
          </CardContainer>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CardContainer>
          <Text style={styles.eyebrow}>Order #{order.id}</Text>
          <Text style={styles.title}>{order.customer_name || 'Customer order'}</Text>
          <Text style={styles.bodyText}>
            {order.address || 'No delivery address provided'}
          </Text>
          <Text style={styles.metaText}>Status: {order.status}</Text>
          <Text style={styles.metaText}>Created: {formatDateTime(order.created_at)}</Text>
          {order.delivery_delivered_at ? (
            <Text style={styles.metaText}>
              Delivered: {formatDateTime(order.delivery_delivered_at)}
            </Text>
          ) : null}
        </CardContainer>

        <CardContainer style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.bodyText}>Phone: {order.phone || 'Not provided'}</Text>
          <View style={styles.buttonColumn}>
            <PrimaryButton
              title="Call customer"
              disabled={!canCallCustomer}
              onPress={() => {
                if (!canCallCustomer) {
                  return;
                }

                void openUrl(`tel:${normalizedPhone}`, 'Call unavailable');
              }}
              variant="secondary"
            />
            <PrimaryButton
              title="Open maps"
              disabled={!canOpenMaps}
              onPress={() => {
                if (!canOpenMaps) {
                  return;
                }

                void openUrl(buildMapsSearchUrl(order.address), 'Maps unavailable');
              }}
              variant="secondary"
            />
          </View>
        </CardContainer>

        <CardContainer style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.itemsList}>
            {(order.items || []).map(item => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.name} x{item.quantity}
                </Text>
                <Text style={styles.itemPrice}>
                  {formatCurrencyAmount(item.price * item.quantity)}
                </Text>
              </View>
            ))}
            {(order.items || []).length === 0 ? (
              <Text style={styles.bodyText}>Order items are still loading.</Text>
            ) : null}
          </View>
        </CardContainer>

        <CardContainer style={styles.section}>
          <Text style={styles.sectionTitle}>Payment summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.bodyText}>Subtotal</Text>
            <Text style={styles.bodyText}>{formatCurrencyAmount(order.subtotal ?? order.total_amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.bodyText}>Delivery fee</Text>
            <Text style={styles.bodyText}>{formatCurrencyAmount(order.delivery_fee ?? 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.bodyText}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrencyAmount(order.final_total ?? order.total_amount)}</Text>
          </View>
        </CardContainer>

        <CardContainer style={styles.section}>
          <Text style={styles.sectionTitle}>Live session</Text>
          <View style={[styles.trackerStateCard, trackerToneStyle]}>
            <Text style={styles.trackerLabel}>Tracker status</Text>
            <Text style={styles.trackerMessage}>{agentTrackerStatus.message}</Text>
          </View>

          <View style={styles.sessionGrid}>
            <View style={styles.sessionTile}>
              <Text style={styles.sessionTileLabel}>Session</Text>
              <Text style={styles.sessionTileValue}>
                {isCurrentActiveOrder ? (currentDeliverySession?.status || 'assigned') : 'completed'}
              </Text>
            </View>
            <View style={styles.sessionTile}>
              <Text style={styles.sessionTileLabel}>Permission</Text>
              <Text style={styles.sessionTileValue}>{agentPermissionState}</Text>
            </View>
            <View style={styles.sessionTile}>
              <Text style={styles.sessionTileLabel}>Tracking</Text>
              <Text style={styles.sessionTileValue}>{isAgentTracking ? 'Live' : 'Idle'}</Text>
            </View>
            <View style={styles.sessionTile}>
              <Text style={styles.sessionTileLabel}>Location</Text>
              <Text style={styles.sessionTileValue}>{hasCustomerLocation ? 'Ready' : 'Missing'}</Text>
            </View>
          </View>

          <Text style={styles.bodyText}>{trackingAvailabilityText}</Text>

          {currentDeliverySession?.started_at ? (
            <Text style={styles.metaText}>
              Started: {formatDateTime(currentDeliverySession.started_at)}
            </Text>
          ) : null}
          {currentDeliverySession?.completed_at ? (
            <Text style={styles.metaText}>
              Completed: {formatDateTime(currentDeliverySession.completed_at)}
            </Text>
          ) : null}
          {agentLastTrackedLocation && isCurrentActiveOrder ? (
            <Text style={styles.metaText}>
              Last tracked point: {agentLastTrackedLocation.lat.toFixed(5)}, {agentLastTrackedLocation.lng.toFixed(5)}
            </Text>
          ) : null}
        </CardContainer>

        <CardContainer style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned partner</Text>
          <Text style={styles.bodyText}>{assignedAgentName}</Text>
          <Text style={styles.metaText}>Phone: {assignedAgentPhone}</Text>
          <Text style={styles.metaText}>Vehicle: {assignedAgentVehicle}</Text>
        </CardContainer>

        {isCurrentActiveOrder ? (
          <View style={styles.section}>
            <View style={styles.buttonColumn}>
              <PrimaryButton
                title={isAgentTracking ? 'Tracking live' : 'Start Delivery'}
                disabled={!canStartTracking}
                loading={isStartingDelivery}
                onPress={() => {
                  void handleStartDelivery();
                }}
              />
              {!hasCustomerLocation ? (
                <Text style={styles.warningText}>
                  Add customer coordinates to this order before starting live delivery tracking.
                </Text>
              ) : null}
              <PrimaryButton
                title="Complete Delivery"
                disabled={!canCompleteDelivery}
                loading={isEndingDelivery}
                onPress={() => {
                  void handleEndDelivery(order.doc_id);
                }}
                variant="secondary"
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  title: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
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
  buttonColumn: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  trackerStateCard: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  trackerStateNeutral: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
  },
  trackerStateSuccess: {
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.success,
  },
  trackerStateWarning: {
    backgroundColor: theme.colors.warningSurface,
    borderColor: theme.colors.warning,
  },
  trackerStateDanger: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.danger,
  },
  trackerLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  trackerMessage: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sessionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sessionTile: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  sessionTileLabel: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  sessionTileValue: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  itemsList: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  itemName: {
    flex: 1,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  itemPrice: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  totalValue: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
