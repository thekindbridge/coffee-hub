import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePulseOnChange, useTheme, useThemedStyles } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { ScalePressable } from '../ui/ScalePressable';

type CartFloatingButtonProps = {
  cartCount: number;
  total: number;
  onPress: () => void;
};

export function CartFloatingButton({
  cartCount,
  total,
  onPress,
}: CartFloatingButtonProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pulseStyle = usePulseOnChange(cartCount);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + theme.spacing.md }]}
    >
      <Animated.View style={pulseStyle}>
        <ScalePressable
          accessibilityRole="button"
          onPress={onPress}
          scaleTo={0.96}
          style={[styles.button, theme.shadows.floating]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="bag-handle" size={18} color={theme.colors.onPrimary} />
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>
              View Cart <Text style={styles.count}>({cartCount})</Text>
            </Text>
            <Text style={styles.subtitle}>Ready for checkout</Text>
          </View>

          <Text style={styles.total}>{formatCurrency(total)}</Text>
        </ScalePressable>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.isDark ? theme.colors.secondary : theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
  count: {
    color: theme.colors.textInverse,
  },
  subtitle: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    color: 'rgba(248, 244, 239, 0.76)',
  },
  total: {
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
});
