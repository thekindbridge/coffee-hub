import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../theme';
import {
  buildOpensInMessage,
  buildShopClosedBannerMessage,
  formatShopTimingRange,
} from '../shared/shopTiming';

type ShopStatusBannerProps = {
  closeTime: string;
  currentTime: number;
  openTime: string;
};

export function ShopStatusBanner({
  closeTime,
  currentTime,
  openTime,
}: ShopStatusBannerProps) {
  const styles = useThemedStyles(createStyles);
  const countdownMessage = buildOpensInMessage(openTime, currentTime);

  return (
    <View style={styles.banner}>
      <View style={styles.statusRow}>
        <View style={styles.statusChip}>
          <View style={styles.statusDot} />
          <Text style={styles.statusChipText}>Shop closed</Text>
        </View>
        <Ionicons name="time-outline" size={18} color="#F5B34B" />
      </View>

      <Text style={styles.title}>
        {buildShopClosedBannerMessage(openTime, closeTime)}
      </Text>

      <Text style={styles.meta}>Hours: {formatShopTimingRange(openTime, closeTime)}</Text>
      <Text style={styles.countdown}>{countdownMessage}</Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  banner: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 179, 75, 0.28)',
    backgroundColor: theme.colors.warningSurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(120, 46, 34, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
  },
  statusChipText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.danger,
  },
  title: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  meta: {
    marginTop: 6,
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  countdown: {
    marginTop: 4,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
