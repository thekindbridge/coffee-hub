import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';

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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.base,
        theme.shadows.soft,
        variant === 'dark'
          ? styles.dark
          : variant === 'tinted'
            ? styles.tinted
            : styles.light,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  light: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  dark: {
    backgroundColor: theme.isDark ? theme.colors.surfaceRaised : theme.colors.primary,
    borderColor: theme.isDark ? theme.colors.borderStrong : 'rgba(255, 255, 255, 0.08)',
  },
  tinted: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
  },
});
