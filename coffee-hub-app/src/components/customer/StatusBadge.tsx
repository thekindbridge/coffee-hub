import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { getCustomerPalette } from './designSystem';

type StatusBadgeTone =
  | 'neutral'
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'progress'
  | 'delivery'
  | 'success'
  | 'danger'
  | 'member';

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

export function StatusBadge({
  label,
  tone = 'neutral',
}: StatusBadgeProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.badge,
        tone === 'pending' ? styles.pending : null,
        tone === 'accepted' ? styles.accepted : null,
        tone === 'preparing' ? styles.preparing : null,
        tone === 'progress' ? styles.progress : null,
        tone === 'delivery' ? styles.delivery : null,
        tone === 'success' ? styles.success : null,
        tone === 'danger' ? styles.danger : null,
        tone === 'member' ? styles.member : null,
      ]}
    >
      <Text
        style={[
          styles.label,
          tone === 'pending' ? styles.pendingLabel : null,
          tone === 'accepted' ? styles.acceptedLabel : null,
          tone === 'preparing' ? styles.preparingLabel : null,
          tone === 'progress' ? styles.progressLabel : null,
          tone === 'delivery' ? styles.deliveryLabel : null,
          tone === 'success' ? styles.successLabel : null,
          tone === 'danger' ? styles.dangerLabel : null,
          tone === 'member' ? styles.memberLabel : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.pill,
      backgroundColor: palette.ghost,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pending: {
      backgroundColor: palette.warningSurface,
    },
    accepted: {
      backgroundColor: 'rgba(103, 146, 240, 0.18)',
    },
    preparing: {
      backgroundColor: 'rgba(232, 144, 71, 0.18)',
    },
    progress: {
      backgroundColor: 'rgba(103, 146, 240, 0.18)',
    },
    delivery: {
      backgroundColor: 'rgba(138, 108, 255, 0.18)',
    },
    success: {
      backgroundColor: palette.successSurface,
    },
    danger: {
      backgroundColor: palette.dangerSurface,
    },
    member: {
      backgroundColor: 'rgba(227, 191, 127, 0.16)',
    },
    label: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    pendingLabel: {
      color: palette.warning,
    },
    acceptedLabel: {
      color: '#8CB3FF',
    },
    preparingLabel: {
      color: '#F2B36B',
    },
    progressLabel: {
      color: '#8CB3FF',
    },
    deliveryLabel: {
      color: '#C7B2FF',
    },
    successLabel: {
      color: palette.success,
    },
    dangerLabel: {
      color: palette.danger,
    },
    memberLabel: {
      color: palette.gold,
    },
  });
};
