import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '../constants/theme';
import type { MenuItem } from '../services/api';

type MenuItemCardProps = {
  item: MenuItem;
  cartQuantity: number;
  onAddToCart: (item: MenuItem, delta: number) => void;
};

const SpiceMeter = ({ level }: { level: number }) => (
  <View style={styles.spiceMeter}>
    {Array.from({ length: 5 }).map((_, index) => (
      <MaterialCommunityIcons
        color={index < level ? palette.primary : 'rgba(255, 255, 255, 0.2)'}
        key={`${level}-${index}`}
        name="fire"
        size={14}
      />
    ))}
  </View>
);

export function MenuItemCard({ item, cartQuantity, onAddToCart }: MenuItemCardProps) {
  const isVeg = item.is_veg;
  const spiceLevel = Math.max(0, Math.min(5, item.spice_level));
  const formattedPrice = Number.isInteger(item.price) ? item.price.toString() : item.price.toFixed(2);
  const hasImage = item.image_url.trim().length > 0;
  const showRecommended = item.rating >= 4.5;

  return (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        {hasImage ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Feather color={palette.secondary} name="coffee" size={30} />
          </View>
        )}

        <View pointerEvents="none" style={styles.imageOverlay} />

        <View style={styles.badgeRow}>
          <View style={styles.metaBadge}>
            <MaterialCommunityIcons
              color={isVeg ? '#34D399' : '#F87171'}
              name={isVeg ? 'leaf' : 'fire'}
              size={12}
            />
            <Text style={styles.metaBadgeText}>{isVeg ? 'Veg' : 'Non-veg'}</Text>
          </View>

          <View style={styles.metaBadge}>
            <Feather color={palette.highlight} name="star" size={12} />
            <Text style={styles.metaBadgeText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>

        {showRecommended ? (
          <View style={styles.recommendedBadge}>
            <Feather color={palette.highlight} name="award" size={12} />
            <Text style={styles.recommendedBadgeText}>Popular</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.copy}>
          <View style={styles.categoryBadge}>
            <Text numberOfLines={1} style={styles.categoryBadgeText}>
              {item.category}
            </Text>
          </View>

          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.title}>
              {item.name}
            </Text>

            <View style={styles.spiceBadge}>
              <MaterialCommunityIcons color={palette.highlight} name="fire" size={12} />
              <Text style={styles.spiceBadgeText}>{spiceLevel}/5</Text>
            </View>
          </View>

          <Text numberOfLines={2} style={styles.description}>
            {item.description}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Feather color={palette.secondary} name="coffee" size={14} />
              <Text style={styles.price}>Rs {formattedPrice}</Text>
            </View>
            <SpiceMeter level={spiceLevel} />
          </View>

          {cartQuantity > 0 ? (
            <View style={styles.quantityBlock}>
              <View style={styles.quantityControls}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onAddToCart(item, -1)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Feather color={palette.textSecondary} name="minus" size={16} />
                </Pressable>

                <Text style={styles.quantityText}>{cartQuantity}</Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => onAddToCart(item, 1)}
                  style={({ pressed }) => [styles.primaryIconButton, pressed && styles.pressed]}
                >
                  <Feather color={palette.textPrimary} name="plus" size={16} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.addBlock}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onAddToCart(item, 1)}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <Feather color={palette.textPrimary} name="plus" size={16} />
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },
  imageWrapper: {
    aspectRatio: 1.08,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    backgroundColor: palette.surfaceStrong,
    justifyContent: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 9, 7, 0.26)',
  },
  badgeRow: {
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 13, 11, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaBadgeText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  recommendedBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 13, 11, 0.86)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: 6,
    left: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
  },
  recommendedBadgeText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
  copy: {
    gap: spacing.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    color: palette.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    color: palette.accent,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  spiceBadge: {
    alignItems: 'center',
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  spiceBadgeText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
  footer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  priceSection: {
    flex: 1,
    gap: spacing.xs,
  },
  priceRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.surfaceSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  price: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  spiceMeter: {
    flexDirection: 'row',
    gap: 2,
  },
  quantityBlock: {
    minWidth: 124,
  },
  quantityControls: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 13, 11, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    padding: 6,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  primaryIconButton: {
    alignItems: 'center',
    backgroundColor: palette.primaryDeep,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quantityText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  addBlock: {
    minWidth: 108,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: palette.primaryDeep,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  addButtonText: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.985 }],
  },
});
