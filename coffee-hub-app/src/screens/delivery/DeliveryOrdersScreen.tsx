import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryMapBackdrop } from '../../components/delivery/DeliveryMapBackdrop';
import { DeliveryStatusToggle } from '../../components/delivery/DeliveryStatusToggle';
import { DeliveryTopBar } from '../../components/delivery/DeliveryTopBar';
import { getDeliveryPalette, getDeliveryShadow } from '../../components/delivery/designSystem';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { DELIVERY_ROUTES } from '../../constants/routes';
import {
  DELIVERY_ORDER_FILTERS,
  type DeliveryOrderFilterId,
  useDeliveryAgentModule,
} from '../../delivery-agent';
import {
  estimateEtaMinutes,
  formatDistanceKm,
  formatEta,
  getAgentToCustomerDistanceKm,
  getDeliveryState,
  getDeliveryStateEyebrow,
  getDeliveryStateLabel,
  getDeliveryStatePrimaryAction,
  getInitials,
  getOrderItemSummary,
  getOrderStatusTone,
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

type QueueCardProps = {
  distanceLabel: string;
  etaLabel: string;
  isHighlighted: boolean;
  onDetails: () => void;
  onPrimaryAction: () => void;
  order: Order;
  primaryActionLabel: string;
  primaryDisabled?: boolean;
  stateEyebrow: string;
  statusLabel: string;
  statusTone: 'neutral' | 'success' | 'warning';
};

function QueueCard({
  distanceLabel,
  etaLabel,
  isHighlighted,
  onDetails,
  onPrimaryAction,
  order,
  primaryActionLabel,
  primaryDisabled = false,
  stateEyebrow,
  statusLabel,
  statusTone,
}: QueueCardProps) {
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.queueCard, isHighlighted ? styles.queueCardHero : null, getDeliveryShadow(theme)]}>
      <View style={styles.queueHeader}>
        {isHighlighted ? (
          <View style={styles.heroLead}>
            <View style={styles.heroThumb}>
              <Ionicons name="cafe" size={22} color={palette.blush} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.cardEyebrow, styles.cardEyebrowWarm]}>{stateEyebrow}</Text>
              <Text style={styles.cardTitle}>{getOrderItemSummary(order)}</Text>
              <Text style={styles.cardSubtitle}>
                {`Order #${order.id} - ${formatCurrency(order.final_total ?? order.total_amount)}`}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.cardEyebrow, statusTone === 'warning' ? styles.cardEyebrowWarm : null]}>
              {stateEyebrow}
            </Text>
            <Text style={styles.cardRef}>#{order.id}</Text>
          </>
        )}

        <View style={styles.etaBlock}>
          {isHighlighted ? (
            <>
              <Text style={styles.etaMeta}>Route Snapshot</Text>
              <Text style={styles.etaValue}>{etaLabel}</Text>
            </>
          ) : (
            <View style={[
              styles.statusBadge,
              statusTone === 'success' ? styles.statusBadgeSuccess : null,
              statusTone === 'warning' ? styles.statusBadgeWarning : null,
            ]}>
              <Text
                style={[
                  styles.statusBadgeLabel,
                  statusTone === 'success' ? styles.statusBadgeLabelSuccess : null,
                  statusTone === 'warning' ? styles.statusBadgeLabelWarning : null,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          )}
        </View>
      </View>

      {!isHighlighted ? (
        <Text style={styles.compactTitle}>{getOrderItemSummary(order)}</Text>
      ) : null}

      <View style={styles.metaList}>
        <View style={styles.metaRow}>
          <View style={styles.metaIconWrap}>
            <Ionicons name="person" size={14} color={palette.blush} />
          </View>
          <View style={styles.metaCopy}>
            <Text style={styles.metaLabel}>Customer</Text>
            <Text style={styles.metaValue}>{order.customer_name || 'Coffee guest'}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaIconWrap}>
            <Ionicons name="location" size={14} color={palette.blush} />
          </View>
          <View style={styles.metaCopy}>
            <Text style={styles.metaLabel}>Delivery Address</Text>
            <Text style={styles.metaValue}>{order.address || 'Address syncing'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.distanceInfo}>{distanceLabel}</Text>

        <View style={styles.actionRow}>
          {primaryActionLabel !== 'Details' ? (
            <ScalePressable
              accessibilityRole="button"
              onPress={onDetails}
              scaleTo={0.97}
              style={styles.actionPillGhost}
            >
              <Text style={styles.actionGhostLabel}>Details</Text>
            </ScalePressable>
          ) : null}

          <ScalePressable
            accessibilityRole="button"
            disabled={primaryDisabled}
            onPress={onPrimaryAction}
            scaleTo={0.97}
            style={[
              styles.actionPillPrimary,
              primaryDisabled ? styles.actionPillPrimaryDisabled : null,
            ]}
          >
            <Text style={styles.actionPrimaryLabel}>
              {primaryDisabled ? 'Accepting...' : primaryActionLabel}
            </Text>
          </ScalePressable>
        </View>
      </View>
    </View>
  );
}

export function DeliveryOrdersScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const styles = useThemedStyles(createStyles);
  const { authPhotoUrl } = useProfileData();
  const {
    acceptingOrderDocId,
    activeOrders,
    completedOrders,
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentDeliverySession,
    currentUserDisplayName,
    handleAcceptDelivery,
    isAgentTracking,
  } = useDeliveryAgentModule();
  const [filter, setFilter] = useState<DeliveryOrderFilterId>('active');

  useEffect(() => {
    if (filter === 'active' && activeOrders.length === 0 && completedOrders.length > 0) {
      setFilter('completed');
      return;
    }

    if (filter === 'completed' && completedOrders.length === 0 && activeOrders.length > 0) {
      setFilter('active');
    }
  }, [activeOrders.length, completedOrders.length, filter]);

  const orders = useMemo(
    () => (filter === 'active' ? activeOrders : completedOrders),
    [activeOrders, completedOrders, filter],
  );
  const initials = getInitials(currentDeliveryAgent?.name || currentUserDisplayName);

  const renderOrder = ({ item }: ListRenderItemInfo<Order>) => {
    const isCurrentOrder = currentDeliveryOrder?.doc_id === item.doc_id;
    const distance = getAgentToCustomerDistanceKm(
      item,
      currentDeliveryAgent?.current_location || currentDeliveryAgent?.last_location || null,
    );
    const deliveryState = getDeliveryState(item, {
      isCurrentOrder,
      isTracking: isCurrentOrder && isAgentTracking,
      session: isCurrentOrder ? currentDeliverySession : null,
    });
    const primaryActionLabel = filter === 'completed'
      ? 'Details'
      : getDeliveryStatePrimaryAction(deliveryState);
    const isPrimaryDisabled = primaryActionLabel === 'Accept' && acceptingOrderDocId === item.doc_id;
    const eta = estimateEtaMinutes(distance, isCurrentOrder && isAgentTracking);
    const distanceLabel = filter === 'completed'
      ? 'Delivery completed'
      : formatDistanceKm(distance);
    const etaLabel = filter === 'completed'
      ? 'Completed'
      : formatEta(eta);
    const statusLabel = getDeliveryStateLabel(deliveryState);
    const statusTone = getOrderStatusTone(statusLabel);
    const isHighlighted = filter === 'active' && isCurrentOrder;

    return (
      <QueueCard
        distanceLabel={distanceLabel}
        etaLabel={etaLabel}
        isHighlighted={isHighlighted}
        onDetails={() => {
          navigation.navigate(DELIVERY_ROUTES.ORDER_DETAILS, {
            orderDocId: item.doc_id,
          });
        }}
        onPrimaryAction={() => {
          if (primaryActionLabel === 'Accept') {
            void handleAcceptDelivery(item.doc_id);
            return;
          }

          if (primaryActionLabel === 'Navigate') {
            navigation.navigate(DELIVERY_ROUTES.MAP, {
              orderDocId: item.doc_id,
            });
            return;
          }

          navigation.navigate(DELIVERY_ROUTES.ORDER_DETAILS, {
            orderDocId: item.doc_id,
          });
        }}
        order={item}
        primaryActionLabel={primaryActionLabel}
        primaryDisabled={isPrimaryDisabled}
        stateEyebrow={getDeliveryStateEyebrow(deliveryState)}
        statusLabel={statusLabel}
        statusTone={statusTone}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenTransition style={styles.screen}>
        <FlatList
          data={orders}
          keyExtractor={item => item.doc_id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <DeliveryTopBar
                avatarUrl={authPhotoUrl}
                centerLabel="Coffee Hub"
                initials={initials}
                leadingLabel="Orders"
                onLeadingPress={() => navigation.navigate(DELIVERY_ROUTES.DASHBOARD)}
                onProfilePress={() => navigation.navigate(DELIVERY_ROUTES.PROFILE)}
              />

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

              <View style={styles.headingWrap}>
                <Text style={styles.heading}>Delivery Queue</Text>
                <Text style={styles.subheading}>
                  {filter === 'active'
                    ? `${orders.length} orders assigned to your route queue`
                    : `${orders.length} deliveries completed recently`}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {filter === 'active' ? 'No active deliveries' : 'No completed deliveries'}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'active'
                  ? 'Fresh assignments will appear here as soon as the admin dispatches them.'
                  : 'Delivered orders will move into this view automatically.'}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={filter === 'active' ? (
            <View style={styles.footerWrap}>
              <DeliveryMapBackdrop compact variant="city" />
            </View>
          ) : <View style={styles.footerSpace} />}
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
    listHeader: {
      gap: 18,
    },
    toggleWrap: {
      marginTop: 10,
    },
    headingWrap: {
      gap: 8,
    },
    heading: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '900',
      color: palette.text,
    },
    subheading: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.textMuted,
    },
    separator: {
      height: 18,
    },
    queueCard: {
      borderRadius: 28,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 18,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 16,
    },
    queueCardHero: {
      paddingVertical: 20,
    },
    queueHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 14,
    },
    heroLead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    heroThumb: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: palette.cardStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCopy: {
      flex: 1,
    },
    cardEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    cardEyebrowWarm: {
      color: palette.caramel,
    },
    cardTitle: {
      marginTop: 4,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '900',
      color: palette.text,
    },
    cardSubtitle: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: palette.textMuted,
    },
    cardRef: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textMuted,
    },
    etaBlock: {
      alignItems: 'flex-end',
      gap: 4,
    },
    etaMeta: {
      fontSize: 12,
      color: palette.textMuted,
    },
    etaValue: {
      fontSize: 16,
      fontWeight: '900',
      color: palette.text,
    },
    statusBadge: {
      borderRadius: theme.radius.pill,
      backgroundColor: palette.chip,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusBadgeWarning: {
      backgroundColor: palette.warningChip,
    },
    statusBadgeSuccess: {
      backgroundColor: palette.successChip,
    },
    statusBadgeLabel: {
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    statusBadgeLabelWarning: {
      color: palette.caramel,
    },
    statusBadgeLabelSuccess: {
      color: palette.success,
    },
    compactTitle: {
      marginTop: -2,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '900',
      color: palette.text,
    },
    metaList: {
      gap: 12,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    metaIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.card,
    },
    metaCopy: {
      flex: 1,
      gap: 2,
    },
    metaLabel: {
      fontSize: 12,
      color: palette.textMuted,
    },
    metaValue: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: palette.text,
    },
    cardFooter: {
      gap: 14,
    },
    distanceInfo: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.textMuted,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionPillGhost: {
      flex: 1,
      minHeight: 46,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: palette.divider,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.02)',
    },
    actionPillPrimary: {
      flex: 1,
      minHeight: 46,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.blush,
    },
    actionPillPrimaryDisabled: {
      opacity: 0.68,
    },
    actionGhostLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.text,
    },
    actionPrimaryLabel: {
      fontSize: 15,
      fontWeight: '900',
      color: palette.background,
    },
    footerWrap: {
      marginTop: 18,
    },
    footerSpace: {
      height: 8,
    },
    emptyCard: {
      marginTop: 16,
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
  });
};
