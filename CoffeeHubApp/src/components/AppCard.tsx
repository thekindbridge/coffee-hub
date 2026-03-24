import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '../constants/theme';

type AppCardProps = PropsWithChildren<{
  variant?: 'default' | 'soft' | 'raised';
  style?: StyleProp<ViewStyle>;
}>;

export function AppCard({ children, style, variant = 'default' }: AppCardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'soft'
          ? styles.softCard
          : variant === 'raised'
            ? styles.raisedCard
            : styles.defaultCard,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  defaultCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  softCard: {
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.border,
    shadowOpacity: 0,
  },
  raisedCard: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.borderStrong,
    shadowOpacity: 0.2,
  },
});
