import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { animateLayout, useTheme, useThemedStyles } from '../../theme';
import type { MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { getCustomerPalette } from '../customer/designSystem';
import { ScalePressable } from './ScalePressable';

export type ProductCardProps = {
  item: MenuItem;
  layout?: 'horizontal' | 'vertical';
  quantity: number;
  isShopOpen?: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
  shopAvailabilityMessage?: string;
};

type ActionControlProps = {
  actionLabel: string;
  item: MenuItem;
  quantity: number;
  isItemAvailable: boolean;
  canOrder: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
};

const MENU_ACCENT = '#F2BE8C';
const MENU_ACCENT_TEXT = '#3A2417';
const LOW_QUALITY_IMAGE_MARKERS = [
  'chatgpt_image',
  'placeholder',
  'dummy',
  'mock',
  'sample',
  'cartoon',
  'via.placeholder',
  'placehold.co',
];
const PREMIUM_FALLBACK_IMAGES = {
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
  latte: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80',
  iced: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80',
  espresso: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=900&q=80',
  dessert: 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?auto=format&fit=crop&w=900&q=80',
  tea: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
  snack: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
} as const;

const needsPremiumFallback = (url: string) => {
  const normalized = url.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return LOW_QUALITY_IMAGE_MARKERS.some(marker => normalized.includes(marker))
    || normalized.endsWith('.svg')
    || normalized.endsWith('.gif')
    || (normalized.endsWith('.png') && !normalized.includes('unsplash'));
};

const getPremiumFallbackImage = (item: MenuItem) => {
  const descriptor = `${item.name} ${item.category}`.toLowerCase();

  if (
    descriptor.includes('latte')
    || descriptor.includes('cappuccino')
    || descriptor.includes('mocha')
    || descriptor.includes('macchiato')
  ) {
    return PREMIUM_FALLBACK_IMAGES.latte;
  }

  if (
    descriptor.includes('iced')
    || descriptor.includes('cold')
    || descriptor.includes('frappe')
    || descriptor.includes('shake')
  ) {
    return PREMIUM_FALLBACK_IMAGES.iced;
  }

  if (
    descriptor.includes('espresso')
    || descriptor.includes('americano')
  ) {
    return PREMIUM_FALLBACK_IMAGES.espresso;
  }

  if (
    descriptor.includes('dessert')
    || descriptor.includes('cake')
    || descriptor.includes('tart')
    || descriptor.includes('cookie')
    || descriptor.includes('brownie')
  ) {
    return PREMIUM_FALLBACK_IMAGES.dessert;
  }

  if (descriptor.includes('tea')) {
    return PREMIUM_FALLBACK_IMAGES.tea;
  }

  if (
    descriptor.includes('snack')
    || descriptor.includes('croissant')
    || descriptor.includes('sandwich')
  ) {
    return PREMIUM_FALLBACK_IMAGES.snack;
  }

  return descriptor.includes('coffee')
    ? PREMIUM_FALLBACK_IMAGES.coffee
    : PREMIUM_FALLBACK_IMAGES.latte;
};

function ActionControl({
  actionLabel,
  item,
  quantity,
  isItemAvailable,
  canOrder,
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
          onPress={() => updateQuantity(-1)}
          style={styles.stepperButton}
        >
          <View style={styles.stepperButtonSecondary}>
            <Ionicons name="remove" size={16} color={palette.text} />
          </View>
        </ScalePressable>

        <Text style={styles.stepperValue}>{quantity}</Text>

        <ScalePressable
          accessibilityRole="button"
          disabled={!canOrder}
          onPress={() => updateQuantity(1)}
          style={[styles.stepperButtonWrap, !canOrder ? styles.disabled : null]}
        >
          <LinearGradient
            colors={canOrder ? [MENU_ACCENT, '#D9A56F'] : palette.ctaGradientDisabled}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.stepperButtonPrimary}
          >
            <Ionicons name="add" size={16} color={MENU_ACCENT_TEXT} />
          </LinearGradient>
        </ScalePressable>
      </View>
    );
  }

  if (!canOrder) {
    return (
      <View style={styles.closedButton}>
        <Text style={styles.closedButtonText}>{actionLabel}</Text>
      </View>
    );
  }

  return (
    <ScalePressable
      accessibilityRole="button"
      onPress={() => updateQuantity(1)}
      style={[
        styles.addButtonWrap,
        !isItemAvailable ? styles.disabled : null,
      ]}
    >
      <LinearGradient
        colors={[MENU_ACCENT, '#D9A56F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.addButton}
      >
        <Ionicons name="add" size={18} color={MENU_ACCENT_TEXT} />
      </LinearGradient>
    </ScalePressable>
  );
}

export function ProductCard({
  item,
  quantity,
  isShopOpen = true,
  onAddToCart,
  shopAvailabilityMessage = '',
}: ProductCardProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const isItemAvailable = item.is_available !== false;
  const canOrder = isShopOpen && isItemAvailable;
  const statusLabel = !isItemAvailable ? 'Unavailable' : !isShopOpen ? 'Store Closed' : '';
  const details = (item.description || 'Small-batch coffee crafted for your next ritual.').trim().replace(/\s+/g, ' ');

  useEffect(() => {
    setHasImageError(false);
  }, [item.id, item.image_url]);

  const resolvedImage = useMemo(() => {
    if (hasImageError || needsPremiumFallback(item.image_url)) {
      return getPremiumFallbackImage(item);
    }

    return item.image_url.trim();
  }, [hasImageError, item]);

  return (
    <View style={styles.card}>
      <View style={styles.mediaWrap}>
        <Image
          source={{ uri: resolvedImage }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setHasImageError(true)}
        />

        <LinearGradient
          colors={['rgba(14, 11, 9, 0.04)', 'rgba(14, 11, 9, 0.22)', 'rgba(14, 11, 9, 0.46)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.imageOverlay}
        />

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={palette.gold} />
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
        </View>

        <View style={styles.availabilityBadge}>
          <View
            style={[
              styles.availabilityDot,
              canOrder ? styles.availabilityDotActive : styles.availabilityDotInactive,
            ]}
          />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.copyBlock}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {details}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <Text numberOfLines={1} style={styles.price}>
              {formatCurrency(item.price)}
            </Text>
            {!canOrder && shopAvailabilityMessage ? (
              <Text style={styles.availabilityMessage} numberOfLines={2}>
                {statusLabel === 'Store Closed' ? shopAvailabilityMessage : statusLabel}
              </Text>
            ) : null}
          </View>

          <View style={[styles.actionSlot, quantity > 0 ? styles.actionSlotExpanded : null]}>
            <ActionControl
              actionLabel={statusLabel || 'Store Closed'}
              item={item}
              quantity={quantity}
              isItemAvailable={isItemAvailable}
              canOrder={canOrder}
              onAddToCart={onAddToCart}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    card: {
      minHeight: 310,
      borderRadius: 24,
      backgroundColor: palette.surfaceLow,
      padding: 12,
      gap: 14,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.4,
      shadowRadius: 40,
      elevation: 16,
    },
    mediaWrap: {
      position: 'relative',
      width: '100%',
      height: 166,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: palette.surfaceHigh,
    },
    image: {
      width: '100%',
      height: '100%',
      backgroundColor: palette.surfaceHigh,
      transform: [{ scale: 1.08 }],
    },
    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    ratingBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(14, 11, 9, 0.76)',
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    ratingText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: '#FFF4EB',
    },
    availabilityBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(14, 11, 9, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    availabilityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    availabilityDotActive: {
      backgroundColor: '#52C97E',
    },
    availabilityDotInactive: {
      backgroundColor: '#E35D56',
    },
    content: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 14,
    },
    copyBlock: {
      gap: 8,
    },
    name: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '900',
      color: palette.text,
    },
    description: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.textMuted,
      minHeight: 36,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 10,
    },
    priceBlock: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    actionSlot: {
      marginLeft: 'auto',
    },
    actionSlotExpanded: {
      width: '100%',
      alignItems: 'flex-end',
      marginLeft: 0,
    },
    price: {
      fontSize: 20,
      fontWeight: '900',
      color: MENU_ACCENT,
      flexShrink: 1,
    },
    availabilityMessage: {
      fontSize: theme.typography.caption,
      color: palette.textMuted,
    },
    addButtonWrap: {
      borderRadius: 22,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.26,
      shadowRadius: 18,
      elevation: 12,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closedButton: {
      minHeight: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceHigh,
      paddingHorizontal: 14,
    },
    closedButtonText: {
      fontSize: theme.typography.caption,
      fontWeight: '800',
      color: palette.textMuted,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 22,
      backgroundColor: palette.surfaceHigh,
      paddingHorizontal: 3,
      paddingVertical: 3,
      gap: 3,
    },
    stepperButton: {
      borderRadius: 18,
    },
    stepperButtonSecondary: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    stepperButtonWrap: {
      borderRadius: 18,
    },
    stepperButtonPrimary: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: {
      minWidth: 20,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '800',
      color: palette.text,
    },
    disabled: {
      opacity: 0.54,
    },
  });
};
