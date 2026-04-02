import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { ScalePressable } from './ScalePressable';

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  inverted?: boolean;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  onActionPress,
  inverted = false,
}: SectionHeaderProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, inverted ? styles.eyebrowInverted : null]}>
            {eyebrow}
          </Text>
        ) : null}

        <Text style={[styles.title, inverted ? styles.titleInverted : null]}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={[styles.subtitle, inverted ? styles.subtitleInverted : null]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actionLabel && onActionPress ? (
        <ScalePressable
          accessibilityRole="button"
          onPress={onActionPress}
          scaleTo={0.96}
          style={styles.action}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </ScalePressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
  eyebrowInverted: {
    color: theme.colors.secondary,
  },
  title: {
    marginTop: 4,
    fontSize: theme.typography.subheading,
    lineHeight: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  titleInverted: {
    color: theme.colors.textInverse,
  },
  subtitle: {
    marginTop: 6,
    fontSize: theme.typography.body,
    lineHeight: 21,
    color: theme.colors.textMuted,
  },
  subtitleInverted: {
    color: 'rgba(248, 244, 239, 0.76)',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
