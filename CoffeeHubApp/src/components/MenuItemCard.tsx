import { Image, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '../constants/theme';
import type { MenuItem } from '../services/api';
import { AppButton } from './AppButton';

type MenuItemCardProps = {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
};

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const hasImage = item.image_url.trim().length > 0;

  return (
    <View style={styles.card}>
      {hasImage ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>No image available</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>Rs. {item.price.toFixed(2)}</Text>
        </View>

        <AppButton label="Add to Cart" onPress={() => onAddToCart(item)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    backgroundColor: palette.muted,
    height: 180,
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  placeholderText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
  content: {
    padding: spacing.md,
    rowGap: spacing.md,
  },
  copy: {
    rowGap: spacing.xs,
  },
  name: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  price: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
