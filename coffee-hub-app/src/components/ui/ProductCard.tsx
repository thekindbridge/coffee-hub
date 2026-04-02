import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { animateLayout, useTheme, useThemedStyles } from '../../theme';
import type { MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { ScalePressable } from './ScalePressable';

export type ProductCardProps = {
  item: MenuItem;
  layout?: 'horizontal' | 'vertical';
  quantity: number;
  isShopOpen?: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
  shopAvailabilityMessage?: string;
};

type InfoPillProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  tone?: 'neutral' | 'veg' | 'nonVeg';
};

function InfoPill({
  icon,
  label,
  tone = 'neutral',
}: InfoPillProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

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
      <Ionicons
        name={icon}
        size={12}
        color={
          tone === 'veg'
            ? theme.colors.success
            : tone === 'nonVeg'
              ? theme.colors.danger
              : theme.colors.secondary
        }
      />
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

type ActionControlProps = {
  item: MenuItem;
  layout: 'horizontal' | 'vertical';
  quantity: number;
  isShopOpen: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
};

function ActionControl({
  item,
  layout,
  quantity,
  isShopOpen,
  onAddToCart,
}: ActionControlProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const updateQuantity = (delta: number) => {
    animateLayout();
    onAddToCart(item, delta);
  };

  if (quantity > 0) {
    return (
      <View style={styles.stepper}>
        <ScalePressable
          accessibilityRole="button"
          onPress={() => updateQuantity(-1)}
          style={[styles.stepperButton, styles.stepperButtonSecondary]}
        >
          <Ionicons name="remove" size={16} color={theme.colors.primary} />
        </ScalePressable>

        <Text style={styles.stepperValue}>{quantity}</Text>

        <ScalePressable
          accessibilityRole="button"
          disabled={!isShopOpen}
          onPress={() => updateQuantity(1)}
          style={[
            styles.stepperButton,
            styles.stepperButtonPrimary,
            !isShopOpen ? styles.disabled : null,
          ]}
        >
          <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
        </ScalePressable>
      </View>
    );
  }

  return (
    <ScalePressable
      accessibilityRole="button"
      disabled={!isShopOpen}
      onPress={() => updateQuantity(1)}
      style={[
        layout === 'vertical' ? styles.iconButton : styles.addButton,
        !isShopOpen ? styles.disabled : null,
      ]}
    >
      <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
      {layout === 'horizontal' ? (
        <Text style={styles.addButtonText}>Add</Text>
      ) : null}
    </ScalePressable>
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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const hasImage = item.image_url.trim().length > 0;
  const isHorizontal = layout === 'horizontal';
  const spiceLevel = Math.max(0, item.spice_level);

  return (
    <View
      style={[
        styles.card,
        theme.shadows.soft,
        isHorizontal ? styles.cardHorizontal : styles.cardVertical,
      ]}
    >
      <View
        style={[
          styles.mediaWrap,
          isHorizontal ? styles.mediaWrapHorizontal : styles.mediaWrapVertical,
        ]}
      >
        {hasImage ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons
              name="cafe-outline"
              size={28}
              color={theme.colors.textMuted}
            />
          </View>
        )}

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={theme.colors.secondary} />
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
            icon={item.is_veg ? 'leaf-outline' : 'restaurant-outline'}
            label={item.is_veg ? 'Veg' : 'Non-veg'}
            tone={item.is_veg ? 'veg' : 'nonVeg'}
          />
          <InfoPill
            icon="water-outline"
            label={`${spiceLevel}/5 spice`}
          />
        </View>

        <Text style={styles.name} numberOfLines={isHorizontal ? 1 : 2}>
          {item.name}
        </Text>
        <Text style={styles.description} numberOfLines={isHorizontal ? 2 : 3}>
          {item.description || 'Freshly brewed and plated for a smoother coffee break.'}
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cardHorizontal: {
    minHeight: 156,
    flexDirection: 'row',
  },
  cardVertical: {
    minHeight: 284,
  },
  mediaWrap: {
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
  },
  mediaWrapHorizontal: {
    width: 124,
  },
  mediaWrapVertical: {
    width: '100%',
    height: 150,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceMuted,
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
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ratingText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay,
  },
  closedText: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: theme.colors.onPrimary,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
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
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.tag,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  infoPillVeg: {
    backgroundColor: theme.colors.successSurface,
  },
  infoPillNonVeg: {
    backgroundColor: theme.colors.dangerSurface,
  },
  infoPillText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  name: {
    marginTop: theme.spacing.sm,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: theme.colors.text,
  },
  description: {
    marginTop: 6,
    fontSize: theme.typography.body,
    lineHeight: 19,
    color: theme.colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  priceBlock: {
    flex: 1,
  },
  priceLabel: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  price: {
    marginTop: 2,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  addButton: {
    minHeight: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    padding: 4,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonSecondary: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  stepperButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  stepperValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  availabilityMessage: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.caption,
    lineHeight: 17,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  disabled: {
    opacity: 0.52,
  },
});
