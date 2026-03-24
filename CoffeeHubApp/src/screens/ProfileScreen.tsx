import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { ROUTES } from '../constants/routes';
import { palette, radius, spacing } from '../constants/theme';
import { useAuth } from '../hooks';
import type { MainTabParamList } from '../navigation/types';

function toDisplayName(email?: string | null) {
  if (!email) {
    return 'Coffee Lover';
  }

  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function ActionRow({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.actionRow}>
      <View style={styles.actionIconShell}>
        <Feather color={palette.secondary} name={icon} size={18} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      {onPress ? <Feather color={palette.textMuted} name="chevron-right" size={18} /> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { isAuthenticated, signOut, user } = useAuth();
  const displayName = toDisplayName(user?.email);
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <ScreenLayout
      eyebrow="Your account"
      subtitle="Manage your Coffee Hub profile, view orders, and keep your account details close at hand."
      title="Profile"
    >
      <View style={styles.content}>
        <AppCard style={styles.heroCard} variant="raised">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'C'}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user?.email ?? 'guest@coffeehub.app'}</Text>
            <View style={styles.memberBadge}>
              <Feather color={palette.success} name="check-circle" size={14} />
              <Text style={styles.memberBadgeText}>
                {isAuthenticated ? 'Signed in and ready to order' : 'Guest account'}
              </Text>
            </View>
          </View>
        </AppCard>

        <AppCard variant="soft">
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionList}>
            <ActionRow
              detail="Track current and previous purchases"
              icon="clock"
              label="My Orders"
              onPress={() => navigation.navigate(ROUTES.Orders)}
            />
            <View style={styles.divider} />
            <ActionRow
              detail="Addresses, preferences, and account details"
              icon="settings"
              label="Settings"
            />
            <View style={styles.divider} />
            <ActionRow
              detail="Help, support, and order assistance"
              icon="help-circle"
              label="Support"
            />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Account details</Text>
          <View style={styles.detailRow}>
            <Feather color={palette.secondary} name="mail" size={16} />
            <Text style={styles.detailText}>{user?.email ?? 'guest@coffeehub.app'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Feather color={palette.secondary} name="shield" size={16} />
            <Text style={styles.detailText}>Protected Coffee Hub session</Text>
          </View>
        </AppCard>

        <AppButton
          icon={<Feather color={palette.accent} name="log-out" size={16} />}
          label="Sign Out"
          onPress={signOut}
          variant="secondary"
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    rowGap: spacing.md,
  },
  heroCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderColor: palette.borderStrong,
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  heroCopy: {
    flex: 1,
  },
  name: {
    color: palette.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  memberBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.successSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  memberBadgeText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  actionList: {
    rowGap: spacing.sm,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionIconShell: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  actionDetail: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  divider: {
    backgroundColor: palette.border,
    height: 1,
    marginLeft: 56,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  detailText: {
    color: palette.textSecondary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
});
