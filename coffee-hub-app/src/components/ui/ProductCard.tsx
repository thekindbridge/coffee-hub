import type { ReactNode } from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import type { MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

export type ProductCardProps = {
  item: MenuItem;
  layout?: 'horizontal' | 'vertical';
  quantity: number;
  isShopOpen?: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
  shopAvailabilityMessage?: string;
};

type ActionControlProps = {
  item: MenuItem;
  layout: 'horizontal' | 'vertical';
  quantity: number;
  isShopOpen: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
};

function InfoPill({
  icon,
  label,
  tone = 'neutral',
}: {
  icon: ReactNode;
  label: string;
  tone?: 'neutral' | 'veg' | 'nonVeg';
}) {
  return (
    <View
      style={[
        styles.infoPill,
        tone === 'veg'
          ? styles.infoPillVeg
          : tone === 'nonVeg'
            ? styles.infoPillNonVeg
            : null,
      ]}
    >
      {icon}
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

function ActionControl({
  item,
  layout,
  quantity,
  isShopOpen,
  onAddToCart,
}: ActionControlProps) {
  if (quantity > 0) {
    return (
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.stepperButton,
            styles.stepperButtonSecondary,
            pressed ? styles.pressed : null,
          ]}
          onPress={() => onAddToCart(item, -1)}
        >
          <Feather name="minus" size={15} color={COLORS.primary} />
        </Pressable>

        <Text style={styles.stepperValue}>{quantity}</Text>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.stepperButton,
            styles.stepperButtonPrimary,
            !isShopOpen ? styles.disabled : null,
            pressed ? styles.pressed : null,
          ]}
          onPress={() => onAddToCart(item, 1)}
          disabled={!isShopOpen}
        >
          <Feather name="plus" size={15} color={COLORS.inkInverse} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        layout === 'vertical' ? styles.iconButton : styles.addButton,
        !isShopOpen ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={() => onAddToCart(item, 1)}
      disabled={!isShopOpen}
    >
      <Feather name="plus" size={16} color={COLORS.inkInverse} />
      {layout === 'horizontal' ? <Text style={styles.addButtonText}>Add</Text> : null}
    </Pressable>
  );
}

export function ProductCard({
  item,
  layout = 'vertical',
  quantity,
  isShopOpen = true,
  onAddToCart,
  shopAvailabilityMessage = '',
}: ProductCardProps) {
  const description = item.description || 'Crafted fresh for quick coffee breaks.';
  const hasImage = item.image_url.trim().length > 0;
  const spiceLevel = Math.max(0, item.spice_level);
  const isHorizontal = layout === 'horizontal';

  return (
    <View
      style={[
        styles.card,
        isHorizontal ? styles.cardHorizontal : styles.cardVertical,
        SHADOWS.soft,
      ]}
    >
      <View style={[styles.mediaWrap, isHorizontal ? styles.mediaWrapHorizontal : styles.mediaWrapVertical]}>
        {hasImage ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <MaterialCommunityIcons
              name="coffee-outline"
              size={28}
              color={COLORS.textMuted}
            />
          </View>
        )}

        <View style={styles.ratingBadge}>
          <Feather name="star" size={12} color={COLORS.accent} />
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
        </View>

        {!isShopOpen ? (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Closed</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.content, isHorizontal ? styles.contentHorizontal : null]}>
        <View style={styles.infoRow}>
          <InfoPill
            tone={item.is_veg ? 'veg' : 'nonVeg'}
            icon={(
              <MaterialCommunityIcons
                name={item.is_veg ? 'leaf' : 'silverware-fork-knife'}
                size={12}
                color={item.is_veg ? COLORS.success : COLORS.danger}
              />
            )}
            label={item.is_veg ? 'Veg' : 'Non-veg'}
          />
          <InfoPill
            icon={<Feather name="droplet" size={12} color={COLORS.accentStrong} />}
            label={`${spiceLevel}/5 spice`}
          />
        </View>

        <Text
          style={styles.name}
          numberOfLines={isHorizontal ? 1 : 2}
        >
          {item.name}
        </Text>
        <Text
          style={styles.description}
          numberOfLines={isHorizontal ? 2 : 3}
        >
          {description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>{formatCurrency(item.price)}</Text>
          </View>

          <ActionControl
            item={item}
            layout={layout}
            quantity={quantity}
            isShopOpen={isShopOpen}
            onAddToCart={onAddToCart}
          />
        </View>

        {!isShopOpen && shopAvailabilityMessage ? (
          <Text style={styles.availabilityMessage} numberOfLines={2}>
            {shopAvailabilityMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cardHorizontal: {
    flexDirection: 'row',
    minHeight: 150,
  },
  cardVertical: {
    minHeight: 276,
  },
  mediaWrap: {
    overflow: 'hidden',
    backgroundColor: COLORS.cardMuted,
  },
  mediaWrapHorizontal: {
    width: 122,
  },
  mediaWrapVertical: {
    width: '100%',
    height: 150,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.cardMuted,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 253, 252, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 21, 19, 0.38)',
  },
  closedText: {
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.inkInverse,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  contentHorizontal: {
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardMuted,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  infoPillVeg: {
    backgroundColor: '#E7F4ED',
  },
  infoPillNonVeg: {
    backgroundColor: '#F8E9E4',
  },
  infoPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  name: {
    marginTop: SPACING.sm,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: COLORS.text,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  priceBlock: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  price: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  addButton: {
    minHeight: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentStrong,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.inkInverse,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentStrong,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 4,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonSecondary: {
    backgroundColor: COLORS.surfaceMuted,
  },
  stepperButtonPrimary: {
    backgroundColor: COLORS.accentStrong,
  },
  stepperValue: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  availabilityMessage: {
    marginTop: SPACING.sm,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '700',
    color: COLORS.accentStrong,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.56,
  },
});
