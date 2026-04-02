import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../../theme';

type RoleBadgeProps = {
  label: string;
  tone?: 'admin' | 'customer' | 'delivery' | 'owner';
};

export function RoleBadge({ label, tone = 'customer' }: RoleBadgeProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.badge, getToneStyles(theme, tone).container]}>
      <Text style={[styles.label, getToneStyles(theme, tone).label]}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  label: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

const getToneStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  tone: NonNullable<RoleBadgeProps['tone']>,
) => {
  switch (tone) {
    case 'admin':
      return StyleSheet.create({
        container: {
          backgroundColor: theme.colors.tag,
          borderColor: theme.colors.secondary,
        },
        label: {
          color: theme.colors.secondary,
        },
      });
    case 'delivery':
      return StyleSheet.create({
        container: {
          backgroundColor: theme.colors.successSurface,
          borderColor: theme.colors.success,
        },
        label: {
          color: theme.colors.success,
        },
      });
    case 'owner':
      return StyleSheet.create({
        container: {
          backgroundColor: theme.colors.warningSurface,
          borderColor: theme.colors.warning,
        },
        label: {
          color: theme.colors.warning,
        },
      });
    case 'customer':
    default:
      return StyleSheet.create({
        container: {
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.primary,
        },
        label: {
          color: theme.colors.primary,
        },
      });
  }
};
