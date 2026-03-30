import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
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
  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null,
        ]}
        onPress={onPress}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="bag-handle" size={18} color={COLORS.surface} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>
            View Cart
            {' '}
            <Text style={styles.count}>({cartCount})</Text>
          </Text>
          <Text style={styles.subtitle}>Proceed to checkout</Text>
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
    bottom: SPACING.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentStrong,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    shadowColor: COLORS.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accent,
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
    color: COLORS.surface,
  },
  count: {
    color: '#F6CFA8',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255, 249, 242, 0.78)',
  },
  total: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF5EA',
  },
});
