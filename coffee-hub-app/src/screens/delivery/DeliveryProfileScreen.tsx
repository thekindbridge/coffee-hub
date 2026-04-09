import { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useAuthContext } from '../../auth/context/AuthContext';
import { CardContainer } from '../../components/ui/CardContainer';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useDeliveryAgentModule } from '../../delivery-agent';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import { RoleScreenFrame } from '../../features/roles/components/RoleScreenFrame';
import { useTheme, useThemedStyles } from '../../theme';

const toTitleCase = (value: string) => value
  .trim()
  .toLowerCase()
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

export function DeliveryProfileScreen() {
  const { logout } = useAuthContext();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { profile } = useProfileData();
  const {
    currentDeliveryAgent,
    currentDeliveryOrder,
    currentUserDisplayName,
    currentUserEmail,
    isUpdatingAvailability,
    updateAvailability,
  } = useDeliveryAgentModule();

  const isOnline = useMemo(
    () => (
      currentDeliveryOrder
        ? true
        : currentDeliveryAgent?.status !== 'offline' && currentDeliveryAgent?.is_active !== false
    ),
    [currentDeliveryAgent?.is_active, currentDeliveryAgent?.status, currentDeliveryOrder],
  );

  const displayName = useMemo(() => {
    const rawName =
      currentDeliveryAgent?.name ||
      profile.name ||
      currentUserDisplayName ||
      'Delivery agent';

    return toTitleCase(rawName) || 'Delivery Agent';
  }, [currentDeliveryAgent?.name, currentUserDisplayName, profile.name]);

  const displayVehicle =
    currentDeliveryAgent?.vehicle_type ||
    profile.vehicleType ||
    'Not provided';
  const displayPhone =
    currentDeliveryAgent?.phone ||
    profile.phone ||
    'Not provided';
  const displayEmail =
    currentDeliveryAgent?.email ||
    profile.email ||
    currentUserEmail;
  const availabilityText = currentDeliveryOrder
    ? 'Busy with active delivery'
    : isOnline
      ? 'Available for new orders'
      : 'Currently offline';
  const availabilityDescription = currentDeliveryOrder
    ? 'You are marked busy while an active delivery is assigned.'
    : isOnline
      ? 'You are available for the next delivery assignment.'
      : 'You are currently offline for new assignments.';
  const assignmentText = currentDeliveryOrder
    ? `Delivering order #${currentDeliveryOrder.id} for ${currentDeliveryOrder.customer_name || 'customer'}.`
    : 'No active delivery is assigned right now.';

  return (
    <RoleScreenFrame
      eyebrow="Delivery agent"
      title="Profile"
      subtitle="Manage your delivery availability and confirm the agent details stored in Firestore."
    >
      <CardContainer style={styles.heroCard} variant="dark">
        <View style={styles.identityRow}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarLabel}>
              {(displayName.charAt(0) || 'D').toUpperCase()}
            </Text>
          </View>

          <View style={styles.identityCopy}>
            <Text style={styles.nameText}>{displayName}</Text>
            <View style={[styles.statusBadge, isOnline ? styles.statusBadgeOnline : styles.statusBadgeOffline]}>
              <Text style={[styles.statusBadgeText, isOnline ? styles.statusBadgeTextOnline : styles.statusBadgeTextOffline]}>
                {availabilityText}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{displayEmail}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{displayPhone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>{displayVehicle}</Text>
          </View>
        </View>
      </CardContainer>

      <CardContainer style={styles.section}>
        <View style={styles.toggleHeader}>
          <View style={styles.toggleCopy}>
            <Text style={styles.sectionTitle}>Online availability</Text>
            <Text style={styles.toggleStatusText}>{availabilityText}</Text>
          </View>

          <Switch
            disabled={isUpdatingAvailability || Boolean(currentDeliveryOrder)}
            ios_backgroundColor={theme.colors.surfaceMuted}
            onValueChange={nextValue => {
              void updateAvailability(nextValue);
            }}
            thumbColor={isOnline ? theme.colors.surface : theme.colors.textMuted}
            trackColor={{
              false: theme.colors.surfaceMuted,
              true: theme.colors.primary,
            }}
            value={isOnline}
          />
        </View>

        <Text style={styles.bodyText}>{availabilityDescription}</Text>
      </CardContainer>

      <CardContainer style={styles.section}>
        <Text style={styles.sectionTitle}>Current assignment</Text>
        <Text style={styles.bodyText}>{assignmentText}</Text>
        {currentDeliveryOrder ? (
          <View style={styles.assignmentMetaRow}>
            <View style={styles.assignmentPill}>
              <Text style={styles.assignmentPillText}>#{currentDeliveryOrder.id}</Text>
            </View>
            <View style={styles.assignmentPill}>
              <Text style={styles.assignmentPillText}>{currentDeliveryOrder.status}</Text>
            </View>
          </View>
        ) : null}
      </CardContainer>

      <View style={styles.section}>
        <PrimaryButton
          title="Log out"
          onPress={() => {
            void logout();
          }}
          variant="secondary"
        />
      </View>
    </RoleScreenFrame>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  section: {
    marginTop: theme.spacing.lg,
  },
  heroCard: {
    padding: theme.spacing.xl,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tag,
  },
  avatarLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  identityCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  statusBadgeOnline: {
    backgroundColor: theme.colors.successSurface,
  },
  statusBadgeOffline: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  statusBadgeText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  statusBadgeTextOnline: {
    color: theme.colors.success,
  },
  statusBadgeTextOffline: {
    color: theme.colors.textMuted,
  },
  detailsList: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  detailRow: {
    gap: 6,
  },
  detailLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  detailValue: {
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.text,
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleStatusText: {
    marginTop: 6,
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.primary,
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
  assignmentMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  assignmentPill: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.tag,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  assignmentPillText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
