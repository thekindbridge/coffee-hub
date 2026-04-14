import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { Offer } from '../../types';
import { ScalePressable } from '../ui/ScalePressable';

type OfferCardProps = {
  actionLabel?: string;
  imageUrl: string;
  isApplied?: boolean;
  onApply?: (offer: Offer) => void;
  offer: Offer;
};

const sensory = {
  caramel: '#f2be8c',
  muted: '#d4c4b7',
  onCaramel: '#482904',
  surfaceContainer: '#221f1d',
  surfaceContainerHigh: '#2c2927',
  text: '#f7eee8',
};

const getDiscountLabel = (offer: Offer) => (
  offer.discountType === 'percentage'
    ? `${offer.discountValue}% OFF`
    : `FLAT Rs ${offer.discountValue} OFF`
);

export function OfferCard({
  actionLabel = 'Claim Offer',
  imageUrl,
  isApplied = false,
  onApply,
  offer,
}: OfferCardProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.card, theme.shadows.card]}>
      <View style={styles.imageWrap}>
        <ImageBackground
          source={{ uri: imageUrl }}
          resizeMode="cover"
          style={styles.image}
          imageStyle={styles.image}
        >
          <LinearGradient
            colors={['rgba(21, 19, 17, 0.04)', 'rgba(21, 19, 17, 0.78)']}
            locations={[0.18, 1]}
            style={styles.imageShade}
          >
            <View style={styles.imageTopRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{getDiscountLabel(offer)}</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {offer.title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {offer.description}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.couponPill}>
            <Ionicons name="ticket-outline" size={14} color={sensory.caramel} />
            <Text style={styles.couponText} numberOfLines={1}>{offer.couponCode}</Text>
          </View>
          <Text style={styles.minimumText}>
            {offer.minOrderAmount > 0 ? `Min Rs ${offer.minOrderAmount}` : 'No minimum'}
          </Text>
        </View>

        <ScalePressable
          accessibilityRole={onApply ? 'button' : undefined}
          disabled={!onApply}
          onPress={() => {
            if (onApply) {
              onApply(offer);
            }
          }}
          style={styles.buttonWrap}
        >
          <View style={[styles.button, isApplied ? styles.buttonApplied : null]}>
            <Text style={[styles.buttonText, isApplied ? styles.buttonTextApplied : null]}>
              {isApplied ? 'Offer Claimed' : actionLabel}
            </Text>
            {!isApplied ? (
              <Ionicons name="arrow-forward" size={15} color={sensory.onCaramel} />
            ) : null}
          </View>
        </ScalePressable>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: sensory.surfaceContainer,
  },
  imageWrap: {
    height: 176,
    backgroundColor: sensory.surfaceContainerHigh,
  },
  image: {
    flex: 1,
  },
  imageShade: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: theme.spacing.md,
  },
  imageTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  badge: {
    borderRadius: 24,
    backgroundColor: sensory.caramel,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: sensory.onCaramel,
  },
  copyBlock: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
    color: sensory.text,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: sensory.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  couponPill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 24,
    backgroundColor: sensory.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  couponText: {
    flexShrink: 1,
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: sensory.text,
  },
  minimumText: {
    fontSize: theme.typography.caption,
    color: 'rgba(212, 196, 183, 0.72)',
  },
  buttonWrap: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  button: {
    minHeight: 50,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: sensory.caramel,
    paddingHorizontal: 16,
  },
  buttonApplied: {
    backgroundColor: sensory.surfaceContainerHigh,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '900',
    color: sensory.onCaramel,
  },
  buttonTextApplied: {
    color: sensory.caramel,
  },
});
