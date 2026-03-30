import type { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

type CardContainerProps = {
  children: ReactNode;
  variant?: 'light' | 'dark' | 'tinted';
  style?: StyleProp<ViewStyle>;
};

export function CardContainer({
  children,
  variant = 'light',
  style,
}: CardContainerProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'dark'
          ? styles.dark
          : variant === 'tinted'
            ? styles.tinted
            : styles.light,
        SHADOWS.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  light: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  dark: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: COLORS.surfaceDark,
  },
  tinted: {
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.cardMuted,
  },
});
