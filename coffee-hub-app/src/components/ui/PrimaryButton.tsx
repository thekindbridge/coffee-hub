import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

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
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : null,
        isSecondary ? styles.buttonSecondary : styles.buttonGhost,
        isPrimary ? SHADOWS.card : null,
        pressed ? styles.pressed : null,
        (disabled || loading) ? styles.disabled : null,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={isPrimary ? COLORS.inkInverse : COLORS.primary}
          />
        ) : icon ? (
          <View style={styles.icon}>{icon}</View>
        ) : null}

        <Text
          style={[
            styles.title,
            isPrimary ? styles.titlePrimary : null,
            isSecondary ? styles.titleSecondary : styles.titleGhost,
          ]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  buttonGhost: {
    backgroundColor: 'rgba(75, 46, 43, 0.08)',
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
    fontSize: 15,
    fontWeight: '800',
  },
  titlePrimary: {
    color: COLORS.inkInverse,
  },
  titleSecondary: {
    color: COLORS.primary,
  },
  titleGhost: {
    color: COLORS.text,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.62,
  },
});
