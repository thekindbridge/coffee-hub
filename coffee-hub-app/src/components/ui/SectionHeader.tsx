import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

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
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
          onPress={onActionPress}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Feather name="chevron-right" size={16} color={COLORS.accentStrong} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: COLORS.accentStrong,
  },
  eyebrowInverted: {
    color: COLORS.accentSoft,
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  titleInverted: {
    color: COLORS.inkInverse,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textMuted,
  },
  subtitleInverted: {
    color: 'rgba(251, 246, 241, 0.72)',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accentStrong,
  },
  pressed: {
    opacity: 0.82,
  },
});
