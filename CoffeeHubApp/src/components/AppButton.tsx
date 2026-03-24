import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { palette, radius, spacing } from '../constants/theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = true,
  icon,
  style,
  labelStyle,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? styles.primaryButton
          : isGhost
            ? styles.ghostButton
            : styles.secondaryButton,
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        !fullWidth ? styles.autoWidth : undefined,
        style,
      ]}
    >
      <View style={[styles.content, !fullWidth ? styles.autoContent : undefined]}>
        {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
        <Text
          style={[
            styles.label,
            isPrimary
              ? styles.primaryLabel
              : isGhost
                ? styles.ghostLabel
                : styles.secondaryLabel,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderWidth: 1,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 54,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: '100%',
  },
  autoWidth: {
    width: undefined,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    width: '100%',
  },
  autoContent: {
    width: undefined,
  },
  primaryButton: {
    backgroundColor: palette.primaryDeep,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: palette.surfaceSoft,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: palette.textPrimary,
  },
  secondaryLabel: {
    color: palette.accent,
  },
  ghostLabel: {
    color: palette.secondary,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
});
