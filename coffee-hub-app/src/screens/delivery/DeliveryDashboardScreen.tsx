import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryTopBar } from '../../components/delivery/DeliveryTopBar';
import { getDeliveryPalette, getDeliveryShadow } from '../../components/delivery/designSystem';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { useDeliveryAgentModule } from '../../delivery-agent';
import { getDeliveryPayoutAmount } from '../../delivery-agent/utils/orderHelpers';
import {
  estimateEtaMinutes,
  formatDistanceKm,
  formatEta,
  getAgentToCustomerDistanceKm,
  getDeliveryState,
  getDeliveryStateEyebrow,
  getDeliveryStateLabel,
  getDeliveryStatePrimaryAction,
  getDeliveryStateProgress,
  getFirstName,
  getGreeting,
  getInitials,
  getOrderStatusTone,
  getTodayEarnings,
  getTotalBeans,
  getOrderItemSummary,
} from '../../delivery-agent/utils/presentation';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import type { DeliveryStackParamList, DeliveryTabParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

type DeliveryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<DeliveryTabParamList>,
  NativeStackNavigationProp<DeliveryStackParamList>
>;

type HomeOrderCardProps = {
  ctaLabel: string;
  distanceLabel: string;
  etaLabel: string;
  eyebrowLabel: string;
  isActionDisabled?: boolean;
  isHighlighted?: boolean;
  itemCount: number;
  onAction: () => void;
  onPress: () => void;
  orderLabel: string;
  progress: number;
  statusLabel: string;
  statusTone: 'neutral' | 'success' | 'warning';
  subtitle?: string;
};

function HomeOrderCard({
  ctaLabel,
  distanceLabel,
  etaLabel,
  eyebrowLabel,
  isActionDisabled = false,
  isHighlighted = false,
  itemCount,
  onAction,
  onPress,
  orderLabel,
  progress,
  statusLabel,
  statusTone,
  subtitle,
}: HomeOrderCardProps) {
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.98}
      style={[
        styles.orderCard,
        isHighlighted ? styles.orderCardHero : null,
      ]}
    >
      {isHighlighted ? <View style={styles.orderHeroAccent} /> : null}

      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderCopy}>
          <Text style={styles.orderEyebrow}>{eyebrowLabel}</Text>
          <Text style={styles.orderTitle}>{orderLabel}</Text>
          {subtitle ? (
            <Text style={styles.orderSubtitle}>{subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.orderMetaBlock}>
          {isHighlighted ? (
            <>
              <Text style={styles.distanceValue}>{distanceLabel}</Text>
              <Text style={styles.distanceMeta}>ETA: {etaLabel}</Text>
            </>
          ) : (
            <View
              style={[
                styles.statusPill,
                statusTone === 'success' ? styles.statusPillSuccess : null,
                statusTone === 'warning' ? styles.statusPillWarning : null,
              ]}
            >
              <Text
                style={[
                  styles.statusPillLabel,
                  statusTone === 'success' ? styles.statusPillLabelSuccess : null,
                  statusTone === 'warning' ? styles.statusPillLabelWarning : null,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          )}
        </View>
      </View>

      {isHighlighted ? (
        <>
          <View style={styles.progressCluster}>
            <View style={styles.coffeeChip}>
              <Ionicons name="cafe" size={18} color={palette.blush} />
            </View>
            <View style={styles.countBubble}>
              <Text style={styles.countBubbleText}>+{itemCount}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          <Text style={styles.progressLabel}>{statusLabel}</Text>

          <PrimaryButton
            title={isActionDisabled ? 'Accepting...' : ctaLabel}
            disabled={isActionDisabled}
            onPress={onAction}
            style={styles.heroAction}
          />
        </>
      ) : (
        <View style={styles.compactFooter}>
          <View style={styles.compactMeta}>
            <Ionicons name="navigate" size={14} color={palette.blush} />
            <Text style={styles.compactMetaText}>{distanceLabel}</Text>
          </View>

          <Text style={styles.compactAction}>{ctaLabel}</Text>
        </View>
      )}
    </ScalePressable>
  );
}

export function DeliveryDashboardScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const { theme } = useTheme();
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
    isUpdatingAvailability,
    updateAvailability,
  } = useDeliveryAgentModule();

  const displayName = currentDeliveryAgent?.name || currentUserDisplayName || 'Delivery Partner';
  const firstName = getFirstName(displayName);
  const initials = getInitials(displayName);
  const isOnline = currentDeliveryOrder
    ? true
    : currentDeliveryAgent?.status !== 'offline' && currentDeliveryAgent?.is_active !== false;
  const todayRouteEarnings = getTodayEarnings(completedOrders, getDeliveryPayoutAmount);
  const totalItemsDelivered = getTotalBeans(completedOrders);
  const visibleOrders = activeOrders.slice(0, 3);

  const cards = useMemo(() => visibleOrders.map(order => {
    const isCurrentOrder = currentDeliveryOrder?.doc_id === order.doc_id;
    const deliveryState = getDeliveryState(order, {
      isCurrentOrder,
      isTracking: isCurrentOrder && isAgentTracking,
      session: isCurrentOrder ? currentDeliverySession : null,
    });
    const distance = getAgentToCustomerDistanceKm(
      order,
      currentDeliveryAgent?.current_location || currentDeliveryAgent?.last_location || null,
    );
    const eta = estimateEtaMinutes(distance, isCurrentOrder && isAgentTracking);
    const statusLabel = getDeliveryStateLabel(deliveryState);
    const primaryAction = getDeliveryStatePrimaryAction(deliveryState);

    return {
      ctaLabel: primaryAction,
      distanceLabel: formatDistanceKm(distance),
      etaLabel: formatEta(eta),
      eyebrowLabel: getDeliveryStateEyebrow(deliveryState),
      isActionDisabled: primaryAction === 'Accept' && acceptingOrderDocId === order.doc_id,
      isHighlighted: isCurrentOrder || (!currentDeliveryOrder && visibleOrders[0]?.doc_id === order.doc_id),
      itemCount: order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1,
      order,
      orderLabel: `Order #${order.id}`,
      progress: getDeliveryStateProgress(deliveryState),
      statusLabel,
      statusTone: getOrderStatusTone(statusLabel),
      subtitle: order.address || getOrderItemSummary(order),
    };
  }), [
    acceptingOrderDocId,
    currentDeliveryAgent?.current_location,
    currentDeliveryAgent?.last_location,
    currentDeliveryOrder,
    currentDeliverySession,
    isAgentTracking,
    visibleOrders,
  ]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <View pointerEvents="none" style={styles.decorLayer}>
            <LinearGradient
              colors={['rgba(232, 188, 183, 0.14)', 'rgba(232, 188, 183, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.decorGlowTop}
            />
            <LinearGradient
              colors={['rgba(200, 146, 99, 0.12)', 'rgba(200, 146, 99, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.decorGlowBottom}
            />
          </View>

          <DeliveryTopBar
            avatarUrl={authPhotoUrl}
            initials={initials}
            leadingLabel="Coffee Hub"
            onLeadingPress={() => navigation.navigate(DELIVERY_ROUTES.ORDERS)}
            onProfilePress={() => navigation.navigate(DELIVERY_ROUTES.PROFILE)}
          />

          <View style={styles.heroRow}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>
                {getGreeting(new Date())},
              </Text>
              <Text style={styles.greetingName}>{firstName}</Text>
            </View>

            <View style={styles.shiftBlock}>
              <Text style={styles.shiftEyebrow}>Active Shift</Text>
              <View style={styles.shiftToggle}>
                <ScalePressable
                  accessibilityRole="button"
                  disabled={!isOnline || isUpdatingAvailability || Boolean(currentDeliveryOrder)}
                  onPress={() => {
                    if (isOnline) {
                      void updateAvailability(false);
                    }
                  }}
                  scaleTo={0.98}
                  style={[styles.shiftOption, !isOnline ? styles.shiftOptionActive : null]}
                >
                  <Text style={[styles.shiftLabel, !isOnline ? styles.shiftLabelActive : null]}>
                    Off
                  </Text>
                </ScalePressable>
                <ScalePressable
                  accessibilityRole="button"
                  disabled={isOnline || isUpdatingAvailability}
                  onPress={() => {
                    if (!isOnline) {
                      void updateAvailability(true);
                    }
                  }}
                  scaleTo={0.98}
                  style={[styles.shiftOption, isOnline ? styles.shiftOptionActive : null]}
                >
                  <Text style={[styles.shiftLabel, isOnline ? styles.shiftLabelActive : null]}>
                    On
                  </Text>
                </ScalePressable>
              </View>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, getDeliveryShadow(theme)]}>
              <Text style={styles.metricEyebrow}>Route Earnings Today</Text>
              <Text style={styles.metricValue}>{formatCurrency(todayRouteEarnings)}</Text>
            </View>
            <View style={[styles.metricCard, getDeliveryShadow(theme)]}>
              <Text style={styles.metricEyebrow}>Items Delivered</Text>
              <Text style={[styles.metricValue, styles.metricValueAccent]}>
                {Intl.NumberFormat('en-IN').format(totalItemsDelivered)}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assigned Orders</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {activeOrders.length} Active
              </Text>
            </View>
          </View>

          {cards.length > 0 ? cards.map(card => (
            <HomeOrderCard
              key={card.order.doc_id}
              ctaLabel={card.ctaLabel}
              distanceLabel={card.distanceLabel}
              etaLabel={card.etaLabel}
              eyebrowLabel={card.eyebrowLabel}
              isActionDisabled={card.isActionDisabled}
              isHighlighted={card.isHighlighted}
              itemCount={card.itemCount}
              onAction={() => {
                if (card.ctaLabel === 'Accept') {
                  void handleAcceptDelivery(card.order.doc_id);
                  return;
                }

                if (card.ctaLabel === 'Navigate') {
                  navigation.navigate(DELIVERY_ROUTES.MAP, {
                    orderDocId: card.order.doc_id,
                  });
                  return;
                }

                navigation.navigate(DELIVERY_ROUTES.ORDER_DETAILS, {
                  orderDocId: card.order.doc_id,
                });
              }}
              onPress={() => {
                navigation.navigate(DELIVERY_ROUTES.ORDER_DETAILS, {
                  orderDocId: card.order.doc_id,
                });
              }}
              orderLabel={card.orderLabel}
              progress={card.progress}
              statusLabel={card.statusLabel}
              statusTone={card.statusTone}
              subtitle={card.subtitle}
            />
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No assigned orders yet</Text>
              <Text style={styles.emptyText}>
                The next dispatch will land here as soon as the admin pushes it to your rider queue.
              </Text>
            </View>
          )}

          <LinearGradient
            colors={['#20435A', '#142A3A', '#1A120F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.safetyCard}
          >
            <View style={styles.lightTrail} />
            <View style={styles.lightTrailSecondary} />
            <View style={styles.skylineBlock} />
            <Text style={styles.safetyEyebrow}>Driver Safety Tip</Text>
            <Text style={styles.safetyText}>
              Keep your eyes on the road, not the screen.
            </Text>
          </LinearGradient>
        </ScreenTransition>
      </ScrollView>
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
    content: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 124,
      gap: 18,
    },
    decorLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    decorGlowTop: {
      position: 'absolute',
      top: -30,
      right: -60,
      width: 220,
      height: 220,
      borderRadius: 120,
    },
    decorGlowBottom: {
      position: 'absolute',
      top: 520,
      left: -70,
      width: 180,
      height: 180,
      borderRadius: 90,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 10,
    },
    greetingBlock: {
      flex: 1,
    },
    greeting: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '900',
      color: palette.text,
    },
    greetingName: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '900',
      color: palette.text,
    },
    shiftBlock: {
      alignItems: 'flex-end',
      gap: 10,
      paddingTop: 8,
    },
    shiftEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    shiftToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.radius.pill,
      backgroundColor: palette.cardMuted,
      padding: 4,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 4,
    },
    shiftOption: {
      minWidth: 46,
      minHeight: 30,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    shiftOptionActive: {
      backgroundColor: palette.blush,
    },
    shiftLabel: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    shiftLabelActive: {
      color: palette.background,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 14,
    },
    metricCard: {
      flex: 1,
      borderRadius: 18,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 16,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    metricEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    metricValue: {
      marginTop: 12,
      fontSize: 18,
      fontWeight: '900',
      color: palette.text,
    },
    metricValueAccent: {
      color: palette.blush,
    },
    sectionHeader: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: palette.text,
    },
    sectionBadge: {
      borderRadius: theme.radius.pill,
      backgroundColor: palette.chipStrong,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    sectionBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.blush,
    },
    orderCard: {
      position: 'relative',
      borderRadius: 22,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 16,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      overflow: 'hidden',
    },
    orderCardHero: {
      paddingHorizontal: 18,
      paddingVertical: 18,
    },
    orderHeroAccent: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 4,
      backgroundColor: palette.blush,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    orderHeaderCopy: {
      flex: 1,
    },
    orderEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    orderTitle: {
      marginTop: 6,
      fontSize: 17,
      fontWeight: '900',
      color: palette.text,
    },
    orderSubtitle: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: palette.textMuted,
    },
    orderMetaBlock: {
      alignItems: 'flex-end',
      gap: 6,
    },
    distanceValue: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.text,
    },
    distanceMeta: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.textMuted,
    },
    statusPill: {
      borderRadius: theme.radius.pill,
      backgroundColor: palette.chip,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    statusPillWarning: {
      backgroundColor: palette.warningChip,
    },
    statusPillSuccess: {
      backgroundColor: palette.successChip,
    },
    statusPillLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.textMuted,
      textTransform: 'uppercase',
    },
    statusPillLabelWarning: {
      color: palette.caramel,
    },
    statusPillLabelSuccess: {
      color: palette.success,
    },
    progressCluster: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    coffeeChip: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.cardStrong,
    },
    countBubble: {
      minWidth: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.chipStrong,
      paddingHorizontal: 10,
    },
    countBubbleText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.text,
    },
    progressTrack: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.06)',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: palette.blush,
    },
    progressLabel: {
      marginTop: 12,
      marginLeft: 54,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      color: palette.text,
    },
    heroAction: {
      marginTop: 18,
    },
    compactFooter: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    compactMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    },
    compactMetaText: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '700',
      color: palette.textMuted,
    },
    compactAction: {
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.6,
      color: palette.blush,
      textTransform: 'uppercase',
    },
    emptyCard: {
      borderRadius: 22,
      backgroundColor: palette.cardMuted,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: palette.text,
    },
    emptyText: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      color: palette.textMuted,
    },
    safetyCard: {
      marginTop: 10,
      minHeight: 136,
      borderRadius: 24,
      overflow: 'hidden',
      paddingHorizontal: 18,
      paddingVertical: 18,
      justifyContent: 'flex-end',
    },
    lightTrail: {
      position: 'absolute',
      left: -30,
      right: -20,
      top: 74,
      height: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(143, 224, 255, 0.28)',
      transform: [{ rotate: '-10deg' }],
    },
    lightTrailSecondary: {
      position: 'absolute',
      left: 20,
      right: -36,
      top: 92,
      height: 3,
      borderRadius: 999,
      backgroundColor: 'rgba(255, 226, 212, 0.22)',
      transform: [{ rotate: '-4deg' }],
    },
    skylineBlock: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 0,
      height: 36,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      backgroundColor: 'rgba(9, 13, 18, 0.34)',
    },
    safetyEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: '#FFE8DD',
    },
    safetyText: {
      marginTop: 6,
      maxWidth: '90%',
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      color: '#FFF7F3',
    },
  });
};
