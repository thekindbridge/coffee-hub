import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { Offer } from '../../types';
import { ScalePressable } from '../ui/ScalePressable';
import { getCustomerPalette } from '../customer/designSystem';

type OfferCardProps = {
  actionLabel?: string;
  isApplied?: boolean;
  onApply?: (offer: Offer) => void;
  offer: Offer;
  tagLabel?: string;
};

const getDiscountLabel = (offer: Offer) => (
  offer.discountType === 'percentage'
    ? `${offer.discountValue}% OFF`
    : `FLAT Rs ${offer.discountValue} OFF`
);

export function OfferCard({
  actionLabel = 'Apply',
  isApplied = false,
  onApply,
  offer,
  tagLabel = 'Limited',
}: OfferCardProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <LinearGradient
      colors={palette.offerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, theme.shadows.card]}
    >
      <View style={styles.headerRow}>
        <View style={styles.tagPill}>
          <Text style={styles.tagText}>{tagLabel}</Text>
        </View>

        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>{getDiscountLabel(offer)}</Text>
        </View>
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {offer.description}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.valueBlock}>
          <Text style={styles.valueText}>
            {offer.discountType === 'percentage'
              ? `${offer.discountValue}%`
              : `Rs ${offer.discountValue}`}
          </Text>
          <Text style={styles.valueSubtext}>
            Minimum order {offer.minOrderAmount > 0 ? `Rs ${offer.minOrderAmount}` : 'not required'}
          </Text>
        </View>

        <View style={styles.couponPill}>
          <Ionicons name="ticket-outline" size={14} color="rgba(248, 244, 239, 0.82)" />
          <Text style={styles.couponText}>{offer.couponCode}</Text>
        </View>
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
          <Text style={styles.buttonText}>{isApplied ? 'Applied' : actionLabel}</Text>
        </View>
      </ScalePressable>
    </LinearGradient>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  tagPill: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(248, 244, 239, 0.88)',
  },
  discountBadge: {
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  discountBadgeText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: 'rgba(248, 244, 239, 0.96)',
  },
  copyBlock: {
    gap: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    color: 'rgba(248, 244, 239, 0.98)',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(248, 244, 239, 0.82)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  valueBlock: {
    flex: 1,
    gap: 4,
  },
  valueText: {
    fontSize: 30,
    fontWeight: '900',
    color: 'rgba(255, 244, 238, 0.98)',
  },
  valueSubtext: {
    fontSize: theme.typography.caption,
    color: 'rgba(248, 244, 239, 0.74)',
  },
  couponPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(12, 9, 8, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  couponText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(248, 244, 239, 0.96)',
  },
  buttonWrap: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  button: {
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 16,
  },
  buttonApplied: {
    backgroundColor: 'rgba(227, 191, 127, 0.2)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(248, 244, 239, 0.96)',
  },
});
