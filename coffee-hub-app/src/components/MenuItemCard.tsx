import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import type { MenuItem } from '../types';
import { formatCurrency } from '../utils/formatCurrency';

type MenuItemCardProps = {
  item: MenuItem;
  layout?: 'horizontal' | 'vertical';
  quantity: number;
  isShopOpen?: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
  shopAvailabilityMessage?: string;
};

type ActionControlProps = {
  item: MenuItem;
  quantity: number;
  isShopOpen: boolean;
  onAddToCart: (item: MenuItem, delta: number) => void;
  tone?: 'default' | 'inverse';
};

function RatingBadge({ rating }: { rating: number }) {
  return (
    <View style={styles.ratingBadge}>
      <Feather name="star" size={12} color={COLORS.highlight} />
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function InfoBadge({
  icon,
  label,
  tone = 'muted',
}: {
  icon: React.ReactNode;
  label: string;
  tone?: 'muted' | 'veg' | 'nonVeg';
}) {
  return (
    <View
      style={[
        styles.infoBadge,
        tone === 'veg'
          ? styles.infoBadgeVeg
          : tone === 'nonVeg'
            ? styles.infoBadgeNonVeg
            : null,
      ]}
    >
      {icon}
      <Text style={styles.infoBadgeText}>{label}</Text>
    </View>
  );
}

function ActionControl({
  item,
  quantity,
  isShopOpen,
  onAddToCart,
  tone = 'default',
}: ActionControlProps) {
  const isInverse = tone === 'inverse';

  if (quantity > 0) {
    return (
      <View style={[styles.stepper, isInverse ? styles.stepperInverse : null]}>
        <Pressable
          style={({ pressed }) => [
            styles.stepperButton,
            styles.stepperButtonSecondary,
            isInverse ? styles.stepperButtonSecondaryInverse : null,
            pressed ? styles.controlPressed : null,
          ]}
          onPress={() => onAddToCart(item, -1)}
        >
          <Feather name="minus" size={15} color={isInverse ? COLORS.inkInverse : COLORS.text} />
        </Pressable>

        <Text style={[styles.quantityText, isInverse ? styles.quantityTextInverse : null]}>{quantity}</Text>

        <Pressable
          style={({ pressed }) => [
            styles.stepperButton,
            styles.stepperButtonPrimary,
            isInverse ? styles.stepperButtonPrimaryInverse : null,
            !isShopOpen ? styles.controlDisabled : null,
            pressed ? styles.controlPressed : null,
          ]}
          onPress={() => onAddToCart(item, 1)}
          disabled={!isShopOpen}
        >
          <Feather name="plus" size={15} color={isInverse ? COLORS.surfaceDark : COLORS.surface} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.addButton,
        isInverse ? styles.addButtonInverse : null,
        !isShopOpen ? styles.controlDisabled : null,
        pressed ? styles.controlPressed : null,
      ]}
      onPress={() => onAddToCart(item, 1)}
      disabled={!isShopOpen}
    >
      <Feather name="plus" size={15} color={isInverse ? COLORS.surfaceDark : COLORS.surface} />
      <Text style={[styles.addButtonText, isInverse ? styles.addButtonTextInverse : null]}>
        {isShopOpen ? 'Add' : 'Closed'}
      </Text>
    </Pressable>
  );
}

export function MenuItemCard({
  item,
  layout = 'vertical',
  quantity,
  isShopOpen = true,
  onAddToCart,
  shopAvailabilityMessage = '',
}: MenuItemCardProps) {
  const description = item.description || 'Freshly prepared and ready to order.';
  const hasImage = item.image_url.trim().length > 0;
  const spiceLevel = Math.max(0, item.spice_level);
  const isHorizontal = layout === 'horizontal';

  const imageNode = hasImage ? (
    <Image
      source={{ uri: item.image_url }}
      style={[styles.image, isHorizontal ? styles.imageHorizontal : styles.imageVertical]}
      resizeMode="cover"
    />
  ) : (
    <View
      style={[
        styles.image,
        styles.imageFallback,
        isHorizontal ? styles.imageHorizontal : styles.imageVertical,
      ]}
    >
      <Text style={styles.imageFallbackText}>No image</Text>
    </View>
  );

  const infoRow = (
    <View style={styles.infoRow}>
      <InfoBadge
        tone={item.is_veg ? 'veg' : 'nonVeg'}
        icon={(
          <MaterialCommunityIcons
            name={item.is_veg ? 'leaf' : 'fire'}
            size={12}
            color={item.is_veg ? '#1E7A54' : '#B44A2F'}
          />
        )}
        label={item.is_veg ? 'Veg' : 'Non-veg'}
      />
      <InfoBadge
        icon={<Feather name="droplet" size={12} color={COLORS.highlight} />}
        label={`${spiceLevel}/5 spice`}
      />
    </View>
  );

  const contentNode = (
    <View style={[styles.content, isHorizontal ? styles.contentHorizontal : styles.contentVertical]}>
      <View style={styles.topRow}>
        <Text style={[styles.name, !isHorizontal ? styles.nameVertical : null]} numberOfLines={isHorizontal ? 1 : 2}>
          {item.name}
        </Text>
        <View style={!isHorizontal ? styles.ratingBadgeVerticalWrap : null}>
          <RatingBadge rating={item.rating} />
        </View>
      </View>

      {infoRow}

      <Text style={[styles.description, !isHorizontal ? styles.descriptionVertical : null]} numberOfLines={2}>
        {description}
      </Text>

      <View style={styles.bottomRow}>
        <Text style={[styles.price, !isHorizontal ? styles.priceVertical : null]}>{formatCurrency(item.price)}</Text>
        <ActionControl
          item={item}
          quantity={quantity}
          isShopOpen={isShopOpen}
          onAddToCart={onAddToCart}
          tone={isHorizontal ? 'default' : 'inverse'}
        />
      </View>

      {!isShopOpen && shopAvailabilityMessage ? (
        <Text style={[styles.availabilityMessage, !isHorizontal ? styles.availabilityMessageVertical : null]} numberOfLines={2}>
          {shopAvailabilityMessage}
        </Text>
      ) : null}
    </View>
  );

  if (isHorizontal) {
    return (
      <View style={[styles.card, styles.cardHorizontal]}>
        <View style={styles.horizontalRow}>
          <View style={styles.mediaWrap}>
            {imageNode}
            {!isShopOpen ? (
              <View style={styles.closedOverlay}>
                <Text style={styles.closedText}>Closed</Text>
              </View>
            ) : null}
          </View>

          {contentNode}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardVertical]}>
      <View style={styles.verticalMediaWrap}>
        {imageNode}
        {!isShopOpen ? (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Closed</Text>
          </View>
        ) : null}
      </View>

      {contentNode}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(38, 21, 14, 0.08)',
    backgroundColor: COLORS.surface,
    shadowColor: '#26150E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHorizontal: {
    marginBottom: SPACING.sm,
    padding: 14,
  },
  cardVertical: {
    backgroundColor: COLORS.surfaceDark,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaWrap: {
    width: 104,
    height: 104,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceMuted,
  },
  verticalMediaWrap: {
    width: '100%',
    height: 176,
    backgroundColor: COLORS.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceMuted,
  },
  imageHorizontal: {
    borderRadius: 16,
  },
  imageVertical: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(38, 21, 14, 0.34)',
  },
  closedText: {
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(38, 21, 14, 0.86)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.surface,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  contentHorizontal: {
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  contentVertical: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  nameVertical: {
    color: COLORS.inkInverse,
    fontWeight: '700',
  },
  ratingBadgeVerticalWrap: {
    marginLeft: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: '#FFF0D5',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  infoBadgeVeg: {
    backgroundColor: '#E4F5EC',
  },
  infoBadgeNonVeg: {
    backgroundColor: '#F9E7E1',
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  descriptionVertical: {
    color: 'rgba(245, 237, 227, 0.72)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  price: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  priceVertical: {
    color: '#FFF4E7',
  },
  addButton: {
    minWidth: 86,
    minHeight: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
  },
  addButtonInverse: {
    backgroundColor: '#F0C89C',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  addButtonTextInverse: {
    color: COLORS.surfaceDark,
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
  stepperInverse: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
  stepperButtonSecondaryInverse: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepperButtonPrimary: {
    backgroundColor: COLORS.accent,
  },
  stepperButtonPrimaryInverse: {
    backgroundColor: '#F0C89C',
  },
  quantityText: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  quantityTextInverse: {
    color: COLORS.inkInverse,
  },
  availabilityMessage: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  availabilityMessageVertical: {
    color: '#F0C89C',
  },
  controlPressed: {
    opacity: 0.84,
  },
  controlDisabled: {
    opacity: 0.55,
  },
});
