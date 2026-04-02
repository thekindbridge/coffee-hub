import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { animateLayout, useTheme, useThemedStyles } from '../theme';
import type { CartItem } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { ScalePressable } from './ui/ScalePressable';

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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const hasImage = item.image_url.trim().length > 0;

  const updateQuantity = (delta: number) => {
    animateLayout();
    onQuantityChange(item, delta);
  };

  return (
    <View style={[styles.card, theme.shadows.soft]}>
      {hasImage ? (
        <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Ionicons name="cafe-outline" size={24} color={theme.colors.textMuted} />
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
            <ScalePressable
              accessibilityRole="button"
              onPress={() => updateQuantity(-1)}
              style={styles.quantityButton}
            >
              <Ionicons name="remove" size={16} color={theme.colors.primary} />
            </ScalePressable>
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            <ScalePressable
              accessibilityRole="button"
              onPress={() => updateQuantity(1)}
              style={[styles.quantityButton, styles.quantityButtonPrimary]}
            >
              <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
            </ScalePressable>
          </View>

          <ScalePressable
            accessibilityRole="button"
            onPress={() => onRemove(item.id)}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Remove</Text>
          </ScalePressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  image: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  unitPrice: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  totalPrice: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 6,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  quantityButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  quantityValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  removeButton: {
    paddingVertical: 4,
  },
  removeText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },
});
