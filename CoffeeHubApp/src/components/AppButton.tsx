import { Pressable, StyleSheet, Text } from 'react-native';

import { palette, radius, spacing } from '../constants/theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: palette.primarySoft,
  },
  primaryLabel: {
    color: palette.textPrimary,
  },
  secondaryLabel: {
    color: palette.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.45,
  },
});
