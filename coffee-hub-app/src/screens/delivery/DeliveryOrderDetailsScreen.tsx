import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryTimeline } from '../../components/delivery/DeliveryTimeline';
import { DeliveryTopBar } from '../../components/delivery/DeliveryTopBar';
import { getDeliveryPalette, getDeliveryShadow } from '../../components/delivery/designSystem';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { useDeliveryAgentModule } from '../../delivery-agent';
import {
  buildMapsSearchUrl,
  formatCurrencyAmount,
  normalizePhoneForTel,
} from '../../delivery-agent/utils/orderHelpers';
import {
  buildDeliveryTimeline,
  estimateEtaMinutes,
  formatDistanceKm,
  formatEta,
  getAgentToCustomerDistanceKm,
  getDeliveryState,
  getDeliveryStateLabel,
  getDeliveryStatePrimaryAction,
  getInitials,
} from '../../delivery-agent/utils/presentation';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import type { DeliveryStackParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../theme';

type DeliveryDetailsRoute = RouteProp<DeliveryStackParamList, 'DeliveryOrderDetails'>;
type DeliveryNavigation = NativeStackNavigationProp<DeliveryStackParamList>;

const openUrl = async (url: string, fallbackTitle: string) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error(`Failed to open ${url}`, error);
    Alert.alert(fallbackTitle, 'Unable to open that action on this device right now.');
  }
};

export function DeliveryOrderDetailsScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const route = useRoute<DeliveryDetailsRoute>();
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { authPhotoUrl } = useProfileData();
  const {
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentDeliverySession,
    currentUserDisplayName,
    handleAcceptDelivery,
    handleEndDelivery,
    handleStartDelivery,
    isAgentTracking,
    acceptingOrderDocId,
    isEndingDelivery,
    isStartingDelivery,
    orders,
  } = useDeliveryAgentModule();

  const order = useMemo(
    () => orders.find(candidate => candidate.doc_id === route.params.orderDocId) || null,
    [orders, route.params.orderDocId],
  );
  const initials = getInitials(currentDeliveryAgent?.name || currentUserDisplayName);

  if (!order) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.emptyWrap}>
          <DeliveryTopBar
            avatarUrl={authPhotoUrl}
            initials={initials}
            leadingIcon="arrow-back"
            leadingLabel="Orders"
            onLeadingPress={() => navigation.goBack()}
          />

          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Order not found</Text>
            <Text style={styles.emptyText}>
              This delivery may have already moved out of the current agent feed.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isCurrentActiveOrder = currentDeliveryOrder?.doc_id === order.doc_id;
  const distance = getAgentToCustomerDistanceKm(
    order,
    currentDeliveryAgent?.current_location || currentDeliveryAgent?.last_location || null,
  );
  const eta = estimateEtaMinutes(distance, isCurrentActiveOrder && isAgentTracking);
  const phone = normalizePhoneForTel(order.phone || '');
  const deliveryState = getDeliveryState(order, {
    isCurrentOrder: isCurrentActiveOrder,
    isTracking: isCurrentActiveOrder && isAgentTracking,
    session: isCurrentActiveOrder ? currentDeliverySession : null,
  });
  const primaryActionLabel = getDeliveryStatePrimaryAction(deliveryState);
  const timeline = buildDeliveryTimeline(
    order,
    isCurrentActiveOrder ? currentDeliverySession : null,
    isCurrentActiveOrder && isAgentTracking,
  );
  const canStartTracking = isCurrentActiveOrder && !isAgentTracking && Boolean(order.customer_location);
  const canCompleteDelivery = isCurrentActiveOrder;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTransition>
          <DeliveryTopBar
            avatarUrl={authPhotoUrl}
            initials={initials}
            leadingIcon="arrow-back"
            leadingLabel="Orders"
            onLeadingPress={() => navigation.goBack()}
          />

          <View style={[styles.heroCard, getDeliveryShadow(theme)]}>
            <View style={styles.heroHeader}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Order Details</Text>
                <Text style={styles.heroTitle}>Order #{order.id}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeLabel}>{getDeliveryStateLabel(deliveryState)}</Text>
              </View>
            </View>

            <View style={styles.heroMetricRow}>
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>Distance</Text>
                <Text style={styles.heroMetricValue}>{formatDistanceKm(distance)}</Text>
              </View>
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>ETA</Text>
                <Text style={styles.heroMetricValue}>{formatEta(eta)}</Text>
              </View>
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>Total</Text>
                <Text style={styles.heroMetricValue}>{formatCurrencyAmount(order.final_total ?? order.total_amount)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.sectionCard, getDeliveryShadow(theme)]}>
            <Text style={styles.sectionTitle}>Delivery Timeline</Text>
            <View style={styles.sectionBody}>
              <DeliveryTimeline steps={timeline} />
            </View>
          </View>

          <View style={[styles.sectionCard, getDeliveryShadow(theme)]}>
            <Text style={styles.sectionTitle}>Customer Info</Text>
            <View style={styles.sectionBody}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={palette.blush} />
                <Text style={styles.infoValue}>{order.customer_name || 'Coffee guest'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={18} color={palette.blush} />
                <Text style={styles.infoValue}>{order.phone || 'Phone unavailable'}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.sectionCard, getDeliveryShadow(theme)]}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.addressText}>{order.address || 'Address unavailable'}</Text>
          </View>

          <View style={[styles.sectionCard, getDeliveryShadow(theme)]}>
            <Text style={styles.sectionTitle}>Items List</Text>
            <View style={styles.itemsList}>
              {(order.items || []).map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {formatCurrencyAmount(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
              {(order.items || []).length === 0 ? (
                <Text style={styles.emptyItems}>Order items are still syncing from Firestore.</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.actionPair}>
            <PrimaryButton
              title="Contact"
              disabled={!phone}
              onPress={() => {
                if (!phone) {
                  return;
                }

                void openUrl(`tel:${phone}`, 'Call unavailable');
              }}
              style={styles.actionButton}
              variant="secondary"
            />
            <PrimaryButton
              title="Navigate"
              onPress={() => {
                void openUrl(buildMapsSearchUrl(order.address), 'Maps unavailable');
              }}
              style={styles.actionButton}
            />
          </View>

          {deliveryState === 'assigned' ? (
            <View style={styles.actionPair}>
              <PrimaryButton
                title={acceptingOrderDocId === order.doc_id ? 'Accepting...' : primaryActionLabel}
                disabled={acceptingOrderDocId === order.doc_id}
                onPress={() => {
                  void handleAcceptDelivery(order.doc_id);
                }}
                style={styles.actionButton}
              />
            </View>
          ) : null}

          {isCurrentActiveOrder ? (
            <View style={styles.actionPair}>
              <PrimaryButton
                title={isAgentTracking ? 'Tracking Live' : 'Start Delivery'}
                disabled={!canStartTracking}
                loading={isStartingDelivery}
                onPress={() => {
                  void handleStartDelivery();
                }}
                style={styles.actionButton}
              />
              <PrimaryButton
                title="Complete Delivery"
                disabled={!canCompleteDelivery}
                loading={isEndingDelivery}
                onPress={() => {
                  void handleEndDelivery(order.doc_id);
                }}
                style={styles.actionButton}
                variant="secondary"
              />
            </View>
          ) : null}

          {!order.customer_location ? (
            <Text style={styles.noteText}>
              Customer coordinates are missing, so live GPS can&apos;t start until the order location is captured.
            </Text>
          ) : null}
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
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 42,
      gap: 18,
    },
    heroCard: {
      borderRadius: 28,
      backgroundColor: palette.cardMuted,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 18,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    heroCopy: {
      flex: 1,
      gap: 6,
    },
    heroEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: palette.text,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.chipStrong,
    },
    heroBadgeLabel: {
      fontSize: 12,
      fontWeight: '900',
      color: palette.blush,
      textTransform: 'uppercase',
    },
    heroMetricRow: {
      flexDirection: 'row',
      gap: 12,
    },
    heroMetric: {
      flex: 1,
      borderRadius: 18,
      backgroundColor: palette.card,
      padding: 14,
      gap: 6,
    },
    heroMetricLabel: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    heroMetricValue: {
      fontSize: 14,
      fontWeight: '900',
      color: palette.text,
    },
    sectionCard: {
      borderRadius: 26,
      backgroundColor: palette.cardMuted,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: palette.text,
    },
    sectionBody: {
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoValue: {
      flex: 1,
      fontSize: 15,
      lineHeight: 21,
      color: palette.text,
    },
    addressText: {
      fontSize: 15,
      lineHeight: 23,
      color: palette.text,
    },
    itemsList: {
      gap: 12,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    itemCopy: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    itemName: {
      flex: 1,
      fontSize: 15,
      lineHeight: 21,
      color: palette.text,
    },
    itemQuantity: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.textMuted,
    },
    itemPrice: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.text,
    },
    emptyItems: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.textMuted,
    },
    actionPair: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
    noteText: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.warning,
    },
    emptyWrap: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 10,
    },
    emptyCard: {
      marginTop: 28,
      borderRadius: 26,
      backgroundColor: palette.cardMuted,
      padding: 22,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: palette.text,
    },
    emptyText: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      color: palette.textMuted,
    },
  });
};
