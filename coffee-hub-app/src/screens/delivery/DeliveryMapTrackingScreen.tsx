import { useMemo } from 'react';
import { useNavigation, useRoute, type CompositeNavigationProp, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DeliveryMapBackdrop } from '../../components/delivery/DeliveryMapBackdrop';
import { DeliveryTimeline } from '../../components/delivery/DeliveryTimeline';
import { DeliveryTopBar } from '../../components/delivery/DeliveryTopBar';
import { getDeliveryPalette, getDeliveryShadow } from '../../components/delivery/designSystem';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { useDeliveryAgentModule } from '../../delivery-agent';
import { normalizePhoneForTel } from '../../delivery-agent/utils/orderHelpers';
import {
  buildDeliveryTimeline,
  estimateEtaMinutes,
  formatEta,
  getAgentToCustomerDistanceKm,
  getDeliveryState,
  getDeliveryStateLabel,
  getInitials,
  getOrderItemSummary,
} from '../../delivery-agent/utils/presentation';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import type { DeliveryStackParamList, DeliveryTabParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../theme';

type DeliveryMapRoute = RouteProp<DeliveryTabParamList, 'DeliveryMap'>;
type DeliveryMapNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<DeliveryTabParamList>,
  NativeStackNavigationProp<DeliveryStackParamList>
>;

export function DeliveryMapTrackingScreen() {
  const navigation = useNavigation<DeliveryMapNavigation>();
  const route = useRoute<DeliveryMapRoute>();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { authPhotoUrl } = useProfileData();
  const {
    activeOrders,
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentDeliverySession,
    currentUserDisplayName,
    isAgentTracking,
    orders,
  } = useDeliveryAgentModule();

  const order = useMemo(() => {
    if (route.params?.orderDocId) {
      return orders.find(candidate => candidate.doc_id === route.params?.orderDocId) || null;
    }

    return currentDeliveryOrder || activeOrders[0] || null;
  }, [activeOrders, currentDeliveryOrder, orders, route.params?.orderDocId]);

  const initials = getInitials(currentDeliveryAgent?.name || currentUserDisplayName);
  const orderState = order
    ? getDeliveryState(order, {
      isCurrentOrder: currentDeliveryOrder?.doc_id === order.doc_id,
      isTracking: currentDeliveryOrder?.doc_id === order.doc_id && isAgentTracking,
      session: currentDeliveryOrder?.doc_id === order.doc_id ? currentDeliverySession : null,
    })
    : null;
  const riderEta = formatEta(
    estimateEtaMinutes(
      order
        ? getAgentToCustomerDistanceKm(
          order,
          currentDeliveryAgent?.current_location || currentDeliveryAgent?.last_location || null,
        )
        : null,
      isAgentTracking,
    ),
  );
  const timeline = order
    ? buildDeliveryTimeline(
      order,
      currentDeliveryOrder?.doc_id === order.doc_id ? currentDeliverySession : null,
      currentDeliveryOrder?.doc_id === order.doc_id && isAgentTracking,
    )
    : [];
  const customerPhone = normalizePhoneForTel(order?.phone || '');

  const openPhone = async () => {
    if (!customerPhone) {
      return;
    }

    try {
      await Linking.openURL(`tel:${customerPhone}`);
    } catch (error) {
      console.error('Unable to start phone call', error);
      Alert.alert('Call unavailable', 'Unable to open the dialer on this device right now.');
    }
  };

  if (!order) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.content}>
          <DeliveryTopBar
            avatarUrl={authPhotoUrl}
            initials={initials}
            leadingIcon="arrow-back"
            leadingLabel="Coffee Hub"
            onLeadingPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }

              navigation.navigate(DELIVERY_ROUTES.ORDERS);
            }}
            onProfilePress={() => navigation.navigate(DELIVERY_ROUTES.PROFILE)}
          />

          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No live route selected</Text>
            <Text style={styles.emptyText}>
              Pick an active delivery from the tracker to open the live map experience.
            </Text>
            <PrimaryButton
              title="Open tracker"
              onPress={() => {
                navigation.navigate(DELIVERY_ROUTES.ORDERS);
              }}
              style={styles.emptyAction}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenTransition style={styles.screen}>
        <View style={styles.content}>
          <DeliveryTopBar
            avatarUrl={authPhotoUrl}
            initials={initials}
            leadingIcon="arrow-back"
            leadingLabel="Coffee Hub"
            onLeadingPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }

              navigation.navigate(DELIVERY_ROUTES.ORDERS);
            }}
            onProfilePress={() => navigation.navigate(DELIVERY_ROUTES.PROFILE)}
          />

          <Text style={styles.mapHeading}>Delivery Map</Text>

          <DeliveryMapBackdrop
            badgeLabel="ETA"
            badgeTitle={riderEta}
            variant="world"
          />

          <View style={[styles.sheet, getDeliveryShadow(theme)]}>
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Text style={styles.sheetTitle}>Delivery Status</Text>
                <Text style={styles.sheetAccent}>{getDeliveryStateLabel(orderState || 'assigned')}</Text>
              </View>
              <View style={styles.priorityPill}>
                <Text style={styles.priorityLabel}>{getDeliveryStateLabel(orderState || 'assigned')}</Text>
              </View>
            </View>

            <Text style={styles.orderId}>Order #{order.id}</Text>

            <View style={styles.timelineWrap}>
              <DeliveryTimeline steps={timeline} />
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionEyebrow}>Delivery Address</Text>
            <Text style={styles.addressText}>
              {order.address || 'No delivery address provided'}
            </Text>

            <Text style={[styles.sectionEyebrow, styles.sectionSpacing]}>Order Details</Text>
            <View style={styles.detailsRow}>
              <View style={styles.detailsIcon}>
                <Text style={styles.detailsIconLabel}>#</Text>
              </View>
              <Text style={styles.detailsText}>
                {getOrderItemSummary(order)}
              </Text>
            </View>
          </View>

          <PrimaryButton
            title={customerPhone ? 'Call Customer' : 'Customer Phone Missing'}
            disabled={!customerPhone}
            onPress={() => {
              void openPhone();
            }}
            style={styles.primaryAction}
          />
        </View>
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
    content: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: 18,
      gap: 14,
    },
    mapHeading: {
      marginTop: 10,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '900',
      textTransform: 'uppercase',
      color: palette.text,
    },
    sheet: {
      marginTop: -36,
      borderRadius: 34,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 26,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    titleCopy: {
      flex: 1,
    },
    sheetTitle: {
      fontSize: 24,
      lineHeight: 28,
      fontWeight: '900',
      color: palette.text,
    },
    sheetAccent: {
      marginTop: 2,
      fontSize: 24,
      lineHeight: 28,
      fontWeight: '900',
      color: palette.blush,
    },
    priorityPill: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: palette.chipStrong,
      borderWidth: 1,
      borderColor: 'rgba(255, 211, 201, 0.16)',
    },
    priorityLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.blush,
    },
    orderId: {
      marginTop: 14,
      fontSize: 16,
      fontWeight: '700',
      color: palette.textMuted,
    },
    timelineWrap: {
      marginTop: 24,
    },
    divider: {
      height: 1,
      backgroundColor: palette.divider,
      marginTop: 20,
      marginBottom: 20,
    },
    sectionEyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    sectionSpacing: {
      marginTop: 24,
    },
    addressText: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: '600',
      color: palette.text,
    },
    detailsRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailsIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.cardStrong,
    },
    detailsIconLabel: {
      fontSize: 18,
    },
    detailsText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '700',
      color: palette.text,
    },
    primaryAction: {
      marginTop: 'auto',
      marginBottom: 8,
    },
    emptyCard: {
      marginTop: 32,
      borderRadius: 28,
      backgroundColor: palette.cardMuted,
      padding: 24,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: palette.text,
    },
    emptyText: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      color: palette.textMuted,
    },
    emptyAction: {
      marginTop: 20,
    },
  });
};
