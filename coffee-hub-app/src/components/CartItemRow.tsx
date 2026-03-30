import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import type { CartItem } from '../types';
import { formatCurrency } from '../utils/formatCurrency';

type CartItemRowProps = {
  item: CartItem;
  onQuantityChange: (item: CartItem, delta: number) => void;
  onRemove: (itemId: string) => void;
};

export function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
}: CartItemRowProps) {
  const hasImage = item.image_url.trim().length > 0;

  return (
    <View style={[styles.card, SHADOWS.soft]}>
      {hasImage ? (
        <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Text style={styles.imageFallbackText}>No image</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.textBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.unitPrice}>{formatCurrency(item.price)} each</Text>
          </View>
          <Text style={styles.totalPrice}>
            {formatCurrency(item.price * item.quantity)}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.quantityControl}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.quantityButton, pressed ? styles.pressed : null]}
              onPress={() => onQuantityChange(item, -1)}
            >
              <Feather name="minus" size={16} color={COLORS.primary} />
            </Pressable>
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.quantityButton,
                styles.quantityButtonPrimary,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => onQuantityChange(item, 1)}
            >
              <Feather name="plus" size={16} color={COLORS.inkInverse} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [pressed ? styles.pressed : null]}
            onPress={() => onRemove(item.id)}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  image: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  unitPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardMuted,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 6,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  quantityButtonPrimary: {
    backgroundColor: COLORS.accentStrong,
  },
  quantityValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  removeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.accentStrong,
  },
  pressed: {
    opacity: 0.82,
  },
});
