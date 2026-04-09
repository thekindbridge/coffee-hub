import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { animateLayout, useTheme, useThemedStyles } from '../../theme';
import type { MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAmbientShadow, getCustomerPalette } from '../customer/designSystem';
import { GlassSurface } from './GlassSurface';
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
  const palette = getCustomerPalette(theme);
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
            ? palette.success
            : tone === 'nonVeg'
              ? palette.danger
              : palette.caramel
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
  const palette = getCustomerPalette(theme);
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
          disabled={!isShopOpen}
          onPress={() => updateQuantity(-1)}
          style={[
            styles.stepperButton,
            styles.stepperButtonSecondary,
            !isShopOpen ? styles.disabled : null,
          ]}
        >
          <Ionicons name="remove" size={16} color={palette.text} />
        </ScalePressable>

        <Text style={styles.stepperValue}>{quantity}</Text>

        <ScalePressable
          accessibilityRole="button"
          disabled={!isShopOpen}
          onPress={() => updateQuantity(1)}
          style={[styles.stepperButtonWrap, !isShopOpen ? styles.disabled : null]}
        >
          <LinearGradient
            colors={palette.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.stepperButtonPrimary}
          >
            <Ionicons name="add" size={16} color={palette.background} />
          </LinearGradient>
        </ScalePressable>
      </View>
    );
  }

  if (!isShopOpen) {
    return (
      <View style={[styles.closedButton, layout === 'vertical' ? styles.closedButtonVertical : null]}>
        <Ionicons name="lock-closed-outline" size={14} color={palette.textMuted} />
        <Text style={styles.closedButtonText}>Store Closed</Text>
      </View>
    );
  }

  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={() => updateQuantity(1)}
      style={layout === 'vertical' ? styles.iconButtonWrap : styles.addButtonWrap}
    >
      <LinearGradient
        colors={palette.ctaGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={layout === 'vertical' ? styles.iconButton : styles.addButton}
      >
        <Ionicons name="add" size={16} color={palette.background} />
        {layout === 'horizontal' ? (
          <Text style={styles.addButtonText}>Add</Text>
        ) : null}
      </LinearGradient>
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
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const hasImage = item.image_url.trim().length > 0;
  const isHorizontal = layout === 'horizontal';
  const spiceLevel = Math.max(0, item.spice_level);
  const imageTintColors: readonly [string, string, string] = theme.isDark
    ? ['rgba(10, 8, 7, 0.02)', 'rgba(10, 8, 7, 0.22)', 'rgba(10, 8, 7, 0.84)']
    : ['rgba(23, 18, 16, 0.02)', 'rgba(23, 18, 16, 0.14)', 'rgba(23, 18, 16, 0.7)'];
  const imageSheenColors: readonly [string, string, string] = theme.isDark
    ? ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0)']
    : ['rgba(255, 255, 255, 0.34)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)'];

  return (
    <GlassSurface
      depth="card"
      intensity={62}
      style={[
        styles.card,
        styles.cardShadow,
        isHorizontal ? styles.cardHorizontal : styles.cardVertical,
      ]}
    >
      <View
        style={[
          styles.mediaWrap,
          isHorizontal ? styles.mediaWrapHorizontal : styles.mediaWrapVertical,
        ]}
      >
        <View
          style={[
            styles.imageBleed,
            isHorizontal ? styles.imageBleedHorizontal : styles.imageBleedVertical,
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
              <Ionicons name="cafe-outline" size={28} color={palette.textMuted} />
            </View>
          )}

          <LinearGradient
            colors={imageTintColors}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.imageTint}
          />

          <LinearGradient
            colors={imageSheenColors}
            locations={[0, 0.35, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.imageSheen}
          />

          <GlassSurface
            intensity={46}
            overlayColor="rgba(23, 18, 16, 0.42)"
            style={styles.ratingBadge}
          >
            <Ionicons name="star" size={12} color={palette.gold} />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </GlassSurface>
        </View>

        {!isShopOpen ? (
          <View style={styles.closedOverlay}>
            <View style={styles.closedPill}>
              <Ionicons name="lock-closed-outline" size={14} color={palette.text} />
              <Text style={styles.closedText}>Store Closed</Text>
            </View>
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
          <InfoPill icon="water-outline" label={`${spiceLevel}/5 spice`} />
        </View>

        <Text style={styles.name} numberOfLines={isHorizontal ? 1 : 2}>
          {item.name}
        </Text>
        <Text style={styles.description} numberOfLines={isHorizontal ? 2 : 3}>
          {item.description || 'Freshly brewed and plated for a slower, smoother coffee ritual.'}
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
    </GlassSurface>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    card: {
      borderRadius: theme.radius.hero,
      overflow: 'hidden',
    },
    cardShadow: getAmbientShadow(theme),
    cardHorizontal: {
      minHeight: 176,
      flexDirection: 'row',
    },
    cardVertical: {
      minHeight: 318,
    },
    mediaWrap: {
      position: 'relative',
      overflow: 'hidden',
    },
    mediaWrapHorizontal: {
      width: 132,
      paddingVertical: theme.spacing.xs,
      paddingLeft: theme.spacing.xs,
    },
    mediaWrapVertical: {
      width: '100%',
      height: 190,
      paddingHorizontal: theme.spacing.xs,
    },
    imageBleed: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: palette.surfaceHighest,
    },
    imageBleedHorizontal: {
      borderRadius: 24,
      marginBottom: -theme.spacing.xs,
    },
    imageBleedVertical: {
      borderRadius: 26,
      marginLeft: -theme.spacing.xs,
      marginRight: -theme.spacing.sm,
    },
    image: {
      width: '100%',
      height: '100%',
      backgroundColor: palette.surfaceHighest,
      transform: [{ scale: 1.05 }],
    },
    imageFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageTint: {
      ...StyleSheet.absoluteFillObject,
    },
    imageSheen: {
      ...StyleSheet.absoluteFillObject,
    },
    ratingBadge: {
      position: 'absolute',
      top: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
      shadowColor: theme.isDark ? '#080605' : '#3B261F',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.isDark ? 0.24 : 0.12,
      shadowRadius: 18,
      elevation: 6,
    },
    ratingText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: '#F8F4EF',
    },
    closedOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceOverlay,
    },
    closedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(23, 18, 16, 0.72)',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    closedText: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      textTransform: 'uppercase',
      color: palette.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
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
      backgroundColor: palette.surfaceGlass,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    infoPillVeg: {
      backgroundColor: palette.successSurface,
    },
    infoPillNonVeg: {
      backgroundColor: palette.dangerSurface,
    },
    infoPillText: {
      fontSize: theme.typography.caption,
      fontWeight: '700',
      color: palette.textMuted,
    },
    name: {
      marginTop: theme.spacing.sm,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: '900',
      color: palette.text,
    },
    description: {
      marginTop: 6,
      fontSize: theme.typography.body,
      lineHeight: 20,
      color: palette.textMuted,
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
      color: palette.textMuted,
    },
    price: {
      marginTop: 2,
      fontSize: 20,
      fontWeight: '900',
      color: palette.caramel,
    },
    addButtonWrap: {
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    addButton: {
      minHeight: 44,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    addButtonText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.background,
    },
    iconButtonWrap: {
      borderRadius: 22,
      overflow: 'hidden',
    },
    iconButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closedButton: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: palette.surfaceHighest,
      paddingHorizontal: 14,
    },
    closedButtonVertical: {
      minWidth: 126,
    },
    closedButtonText: {
      fontSize: theme.typography.caption,
      fontWeight: '700',
      color: palette.textMuted,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.radius.pill,
      backgroundColor: palette.surfaceGlassStrong,
      padding: 4,
    },
    stepperButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperButtonSecondary: {
      backgroundColor: palette.surfaceLow,
    },
    stepperButtonWrap: {
      borderRadius: 17,
      overflow: 'hidden',
    },
    stepperButtonPrimary: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: {
      minWidth: 28,
      textAlign: 'center',
      fontSize: theme.typography.body,
      fontWeight: '800',
      color: palette.text,
    },
    availabilityMessage: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.caption,
      lineHeight: 17,
      fontWeight: '700',
      color: palette.textMuted,
    },
    disabled: {
      opacity: 0.52,
    },
  });
};
