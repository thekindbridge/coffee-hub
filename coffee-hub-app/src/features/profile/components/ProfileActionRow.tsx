import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../../theme';
import { ScalePressable } from '../../../components/ui/ScalePressable';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ProfileActionRowProps = {
  icon: IconName;
  onPress?: () => void;
  subtitle?: string;
  title: string;
  trailingLabel?: string;
};

function RowContent({
  icon,
  subtitle,
  title,
  trailingLabel,
  onPress,
}: ProfileActionRowProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <View style={styles.leading}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.trailing}>
        {trailingLabel ? (
          <Text style={styles.trailingLabel}>{trailingLabel}</Text>
        ) : null}
        {onPress ? (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        ) : null}
      </View>
    </View>
  );
}

export function ProfileActionRow(props: ProfileActionRowProps) {
  const styles = useThemedStyles(createStyles);

  if (!props.onPress) {
    return <RowContent {...props} />;
  }

  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={styles.pressable}
    >
      <RowContent {...props} />
    </ScalePressable>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  pressable: {
    borderRadius: theme.radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: theme.colors.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trailingLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
