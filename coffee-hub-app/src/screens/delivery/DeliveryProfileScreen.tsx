import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../auth/context/AuthContext';
import { DeliveryBarChart } from '../../components/delivery/DeliveryBarChart';
import { DeliveryTopBar } from '../../components/delivery/DeliveryTopBar';
import { getDeliveryPalette, getDeliveryShadow } from '../../components/delivery/designSystem';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { DELIVERY_ROUTES } from '../../constants/routes';
import { useDeliveryAgentModule } from '../../delivery-agent';
import { getDeliveryPayoutAmount } from '../../delivery-agent/utils/orderHelpers';
import {
  buildWeeklyChart,
  getAverageDeliveryMinutes,
  getInitials,
  getTodayEarnings,
} from '../../delivery-agent/utils/presentation';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import type { DeliveryStackParamList, DeliveryTabParamList } from '../../navigation/types';
import { useTheme, useThemedStyles } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

type DeliveryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<DeliveryTabParamList>,
  NativeStackNavigationProp<DeliveryStackParamList>
>;

type SettingsRowProps = {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
  title: string;
};

function SettingsRow({
  disabled = false,
  icon,
  subtitle,
  title,
}: SettingsRowProps) {
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <ScalePressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {}}
      scaleTo={0.98}
      style={[styles.settingsRow, disabled ? styles.settingsRowDisabled : null]}
    >
      <View style={styles.settingsLead}>
        <View style={styles.settingsIconWrap}>
          <Ionicons name={icon} size={18} color={palette.blush} />
        </View>
        <View style={styles.settingsCopy}>
          <Text style={styles.settingsTitle}>{title}</Text>
          <Text style={styles.settingsSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Text style={styles.settingsStatus}>{disabled ? 'Unavailable' : 'Open'}</Text>
    </ScalePressable>
  );
}

export function DeliveryProfileScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { authPhotoUrl } = useProfileData();
  const { logout } = useAuthContext();
  const {
    completedOrders,
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentUserDisplayName,
    isUpdatingAvailability,
    updateAvailability,
  } = useDeliveryAgentModule();

  const displayName = currentDeliveryAgent?.name || currentUserDisplayName || 'Delivery Partner';
  const initials = getInitials(displayName);
  const isOnline = currentDeliveryOrder
    ? true
    : currentDeliveryAgent?.status !== 'offline' && currentDeliveryAgent?.is_active !== false;
  const averageDeliveryMinutes = getAverageDeliveryMinutes(completedOrders);
  const weeklyChart = useMemo(
    () => buildWeeklyChart(completedOrders, getDeliveryPayoutAmount),
    [completedOrders],
  );
  const weeklyRouteEarnings = useMemo(
    () => weeklyChart.reduce((sum, point) => sum + point.total, 0),
    [weeklyChart],
  );
  const todayRouteEarnings = getTodayEarnings(completedOrders, getDeliveryPayoutAmount);
  const completedDeliveries = completedOrders.length;
  const handledRevenue = useMemo(
    () => completedOrders.reduce((sum, order) => sum + (order.final_total ?? order.total_amount), 0),
    [completedOrders],
  );

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
            leadingLabel="Coffee Hub"
            onLeadingPress={() => navigation.navigate(DELIVERY_ROUTES.DASHBOARD)}
            onProfilePress={() => navigation.navigate(DELIVERY_ROUTES.PROFILE)}
          />

          <View style={styles.headerBlock}>
            <Text style={styles.roleLabel}>
              {currentDeliveryAgent?.vehicle_type
                ? `Vehicle - ${currentDeliveryAgent.vehicle_type}`
                : 'Delivery Partner'}
            </Text>
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.metaBadge, isOnline ? styles.metaBadgeOnline : styles.metaBadgeOffline]}>
                <View style={[styles.metaDot, isOnline ? styles.metaDotOnline : styles.metaDotOffline]} />
                <Text style={styles.metaText}>{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
              <Text style={styles.metaDivider}>|</Text>
              <Text style={styles.metaText}>
                {Intl.NumberFormat('en-IN').format(completedDeliveries)} completed deliveries
              </Text>
            </View>
          </View>

          <ScalePressable
            accessibilityRole="button"
            disabled={isUpdatingAvailability || Boolean(currentDeliveryOrder)}
            onPress={() => {
              void updateAvailability(!isOnline);
            }}
            scaleTo={0.98}
            style={[styles.onlineButton, isOnline ? styles.onlineButtonActive : null]}
          >
            <Text style={[styles.onlineButtonLabel, isOnline ? styles.onlineButtonLabelActive : null]}>
              {currentDeliveryOrder ? 'On Delivery' : isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
          </ScalePressable>

          <View style={[styles.earningsCard, getDeliveryShadow(theme)]}>
            <Text style={styles.earningsLabel}>Weekly Route Earnings</Text>
            <Text style={styles.earningsValue}>{formatCurrency(weeklyRouteEarnings)}</Text>
            <Text style={styles.earningsSubtitle}>
              {completedDeliveries > 0
                ? 'Based on completed deliveries and recorded delivery fees.'
                : 'Complete a delivery to start building weekly payout data.'}
            </Text>
            <DeliveryBarChart points={weeklyChart} />
          </View>

          <View style={styles.statStack}>
            <View style={[styles.statCard, getDeliveryShadow(theme)]}>
              <Ionicons name="wallet-outline" size={20} color="#F3BEAF" />
              <Text style={styles.statLabel}>Today&apos;s Route Earnings</Text>
              <Text style={styles.statValue}>{formatCurrency(todayRouteEarnings)}</Text>
            </View>

            <View style={[styles.statCard, getDeliveryShadow(theme)]}>
              <Ionicons name="time-outline" size={20} color="#F3BEAF" />
              <Text style={styles.statLabel}>Average Delivery Time</Text>
              <Text style={styles.statValue}>
                {averageDeliveryMinutes === null
                  ? 'No completed routes yet'
                  : `${averageDeliveryMinutes.toFixed(1)} min`}
              </Text>
            </View>

            <View style={[styles.statCard, getDeliveryShadow(theme)]}>
              <Ionicons name="cash-outline" size={20} color="#F3BEAF" />
              <Text style={styles.statLabel}>Handled Order Revenue</Text>
              <Text style={styles.statValue}>{formatCurrency(handledRevenue)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Profile</Text>
            <View style={[styles.sectionCard, getDeliveryShadow(theme)]}>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={18} color="#F3BEAF" />
                <View style={styles.infoCopy}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{currentDeliveryAgent?.phone || 'Not configured'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color="#F3BEAF" />
                <View style={styles.infoCopy}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{currentDeliveryAgent?.email || 'Not configured'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="bicycle-outline" size={18} color="#F3BEAF" />
                <View style={styles.infoCopy}>
                  <Text style={styles.infoLabel}>Vehicle</Text>
                  <Text style={styles.infoValue}>{currentDeliveryAgent?.vehicle_type || 'Not configured'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={[styles.sectionCard, getDeliveryShadow(theme)]}>
              <SettingsRow
                disabled
                icon="wallet-outline"
                subtitle="Payout methods are managed by dispatch and are not editable in this build."
                title="Payout Methods"
              />
              <SettingsRow
                disabled
                icon="shield-checkmark-outline"
                subtitle="Trust and safety controls are read-only until the operations flow is connected."
                title="Trust & Safety"
              />
              <SettingsRow
                disabled
                icon="notifications-outline"
                subtitle="Notification preferences are not configured for the delivery shell yet."
                title="Notification Preferences"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Help & Support</Text>
            <View style={[styles.supportCard, getDeliveryShadow(theme)]}>
              <View style={styles.supportCopy}>
                <Text style={styles.supportTitle}>Support channel unavailable</Text>
                <Text style={styles.supportText}>
                  Dispatch support is not configured in the mobile delivery shell yet. Once operations adds a support contact, it will appear here as a direct help action.
                </Text>
              </View>

              <View style={styles.supportBadge}>
                <Text style={styles.supportBadgeText}>Disabled</Text>
              </View>
            </View>
          </View>

          <ScalePressable
            accessibilityRole="button"
            onPress={() => {
              void logout();
            }}
            scaleTo={0.98}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFF3EE" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </ScalePressable>
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
      paddingBottom: 118,
      gap: 18,
    },
    headerBlock: {
      gap: 8,
      marginTop: 6,
    },
    roleLabel: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.caramel,
    },
    name: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '900',
      color: palette.text,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    metaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    metaBadgeOnline: {
      backgroundColor: palette.successChip,
    },
    metaBadgeOffline: {
      backgroundColor: palette.cardStrong,
    },
    metaDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    metaDotOnline: {
      backgroundColor: palette.success,
    },
    metaDotOffline: {
      backgroundColor: palette.textMuted,
    },
    metaText: {
      fontSize: 15,
      color: palette.text,
    },
    metaDivider: {
      fontSize: 14,
      color: palette.textMuted,
    },
    onlineButton: {
      alignSelf: 'flex-start',
      minHeight: 48,
      borderRadius: theme.radius.pill,
      backgroundColor: palette.blush,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    onlineButtonActive: {
      backgroundColor: palette.cardStrong,
    },
    onlineButtonLabel: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.background,
    },
    onlineButtonLabelActive: {
      color: palette.text,
    },
    earningsCard: {
      borderRadius: 28,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 18,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    earningsLabel: {
      fontSize: 15,
      color: palette.text,
    },
    earningsValue: {
      marginTop: 8,
      fontSize: 28,
      fontWeight: '900',
      color: palette.text,
    },
    earningsSubtitle: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      color: palette.textMuted,
    },
    statStack: {
      gap: 18,
    },
    statCard: {
      borderRadius: 26,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 18,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 8,
    },
    statLabel: {
      fontSize: 15,
      color: palette.textMuted,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '900',
      color: palette.text,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: palette.text,
    },
    sectionCard: {
      borderRadius: 26,
      backgroundColor: palette.cardMuted,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoCopy: {
      flex: 1,
      gap: 2,
    },
    infoLabel: {
      fontSize: 12,
      color: palette.textMuted,
      textTransform: 'uppercase',
    },
    infoValue: {
      fontSize: 15,
      lineHeight: 21,
      color: palette.text,
      fontWeight: '700',
    },
    settingsRow: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    settingsRowDisabled: {
      opacity: 0.88,
    },
    settingsLead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    },
    settingsIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.cardStrong,
    },
    settingsCopy: {
      flex: 1,
      gap: 2,
    },
    settingsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.text,
    },
    settingsSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.textMuted,
    },
    settingsStatus: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.textMuted,
      textTransform: 'uppercase',
    },
    supportCard: {
      borderRadius: 26,
      backgroundColor: palette.cardMuted,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 16,
    },
    supportCopy: {
      gap: 8,
    },
    supportTitle: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '900',
      color: palette.text,
    },
    supportText: {
      fontSize: 14,
      lineHeight: 21,
      color: palette.textMuted,
    },
    supportBadge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.pill,
      backgroundColor: palette.cardStrong,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    supportBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.textMuted,
      textTransform: 'uppercase',
    },
    logoutButton: {
      marginTop: 4,
      minHeight: 56,
      borderRadius: 20,
      backgroundColor: '#4F1212',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    logoutButtonText: {
      fontSize: 17,
      fontWeight: '800',
      color: '#FFF3EE',
    },
  });
};
