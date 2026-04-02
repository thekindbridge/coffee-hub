import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { ScalePressable } from './ScalePressable';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <ScalePressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      scaleTo={0.95}
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : null,
        isSecondary ? styles.secondaryButton : styles.ghostButton,
        isPrimary ? theme.shadows.card : null,
        (disabled || loading) ? styles.disabled : null,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? theme.colors.onPrimary : theme.colors.primary}
            size="small"
          />
        ) : icon ? (
          <View style={styles.icon}>{icon}</View>
        ) : null}

        <Text
          style={[
            styles.title,
            isPrimary ? styles.primaryTitle : null,
            isSecondary ? styles.secondaryTitle : styles.ghostTitle,
          ]}
        >
          {title}
        </Text>
      </View>
    </ScalePressable>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  ghostButton: {
    backgroundColor: theme.colors.tag,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  primaryTitle: {
    color: theme.colors.onPrimary,
  },
  secondaryTitle: {
    color: theme.colors.primary,
  },
  ghostTitle: {
    color: theme.colors.text,
  },
  disabled: {
    opacity: 0.56,
  },
});
