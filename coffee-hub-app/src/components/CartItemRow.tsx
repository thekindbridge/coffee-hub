import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
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
    <View style={styles.card}>
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
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.unitPrice}>{formatCurrency(item.price)}</Text>
          </View>
          <Text style={styles.totalPrice}>{formatCurrency(item.price * item.quantity)}</Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.quantityControl}>
            <Pressable
              style={({ pressed }) => [styles.quantityButton, pressed ? styles.pressed : null]}
              onPress={() => onQuantityChange(item, -1)}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </Pressable>
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.quantityButton,
                styles.quantityButtonPrimary,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => onQuantityChange(item, 1)}
            >
              <Text style={styles.quantityButtonPrimaryText}>+</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => onRemove(item.id)}>
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
    backgroundColor: COLORS.card,
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
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  unitPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent,
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accentStrong,
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
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 6,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  quantityButtonPrimary: {
    backgroundColor: COLORS.accent,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  quantityButtonPrimaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.surface,
  },
  quantityValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  removeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.82,
  },
});
