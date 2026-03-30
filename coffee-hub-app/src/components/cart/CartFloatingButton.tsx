import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatCurrency';

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

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + SPACING.md }]}
    >
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          SHADOWS.floating,
          pressed ? styles.buttonPressed : null,
        ]}
        onPress={onPress}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="bag-handle" size={18} color={COLORS.inkInverse} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>
            View Cart{' '}
            <Text style={styles.count}>({cartCount})</Text>
          </Text>
          <Text style={styles.subtitle}>Ready for checkout</Text>
        </View>

        <Text style={styles.total}>{formatCurrency(total)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
  count: {
    color: COLORS.accentSoft,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(251, 246, 241, 0.78)',
  },
  total: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
});
