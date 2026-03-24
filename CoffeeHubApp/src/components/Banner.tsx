import type { ReactNode } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '../constants/theme';

type BannerBadge = {
  icon: ReactNode;
  label: string;
};

type BannerAction = {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

type BannerMetric = {
  label: string;
  value: string;
};

type BannerProps = {
  badges: BannerBadge[];
  backgroundImageUri: string;
  description: string;
  eyebrow: string;
  metrics: BannerMetric[];
  primaryAction: BannerAction;
  secondaryAction: BannerAction;
  title: string;
};

function BannerActionButton({ icon, label, onPress, variant = 'primary' }: BannerAction) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isPrimary ? styles.primaryActionButton : styles.secondaryActionButton,
        pressed ? styles.pressed : undefined,
      ]}
    >
      {icon}
      <Text style={[styles.actionLabel, isPrimary ? styles.primaryActionLabel : styles.secondaryActionLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Banner({
  badges,
  backgroundImageUri,
  description,
  eyebrow,
  metrics,
  primaryAction,
  secondaryAction,
  title,
}: BannerProps) {
  return (
    <ImageBackground
      imageStyle={styles.image}
      source={{ uri: backgroundImageUri }}
      style={styles.card}
    >
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.badgeRow}>
          {badges.map(badge => (
            <View key={badge.label} style={styles.badge}>
              {badge.icon}
              <Text style={styles.badgeLabel}>{badge.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.actions}>
          <BannerActionButton {...primaryAction} />
          <BannerActionButton {...secondaryAction} />
        </View>

        <View style={styles.metricRow}>
          {metrics.map(metric => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: palette.border,
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  image: {
    borderRadius: 30,
    opacity: 0.3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 9, 8, 0.56)',
  },
  content: {
    gap: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  copy: {
    gap: spacing.sm,
    maxWidth: 280,
  },
  eyebrow: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3.4,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.accent,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.1,
    lineHeight: 38,
  },
  description: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  primaryActionButton: {
    backgroundColor: palette.primary,
  },
  secondaryActionButton: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.border,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryActionLabel: {
    color: palette.textPrimary,
  },
  secondaryActionLabel: {
    color: palette.textSecondary,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 24, 20, 0.92)',
    borderRadius: 20,
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  metricValue: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  metricLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.9,
  },
});
